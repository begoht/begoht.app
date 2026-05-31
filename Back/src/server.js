require("dotenv").config();
require("./services/email/email.service");

const { redis, socketPubClient, socketSubClient } = require("./config/redis");
const express = require("express");
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const { createAdapter } = require("@socket.io/redis-adapter");
const path = require("path");
const limpiarEstadosHuerfanos = require("./utils/startupCleanup");

// 🔹 BullBoard
const { createBullBoard } = require("@bull-board/api");
const { BullMQAdapter } = require("@bull-board/api/bullMQAdapter");
const { ExpressAdapter } = require("@bull-board/express");
const { matchingQueue } = require("./config/queues");

const Wallet = require("./models/Wallet");
const User = require("./models/User");
const Viaje = require("./models/Viaje");

const shareRoutes = require("./routes/pagos.share.route");
const trackSocket = require("./sockets/viajes/track.socket");



// ============================
// 🔹 BULL BOARD
// ============================
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");

createBullBoard({
  queues: [new BullMQAdapter(matchingQueue)],
  serverAdapter,
});

// ============================
// 🔹 EXPRESS + HTTP
// ============================
const app = express();
const server = http.createServer(app);
app.set("trust proxy", 1);

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Puerto ${process.env.PORT || 3000} ya esta en uso`);
  } else {
    console.error("Error del servidor HTTP:", err);
  }

  process.exit(1);
});

// ============================
// 🔹 SOCKET.IO
// ============================
const socketTransports = (process.env.SOCKET_TRANSPORTS || "websocket")
  .split(",")
  .map((transport) => transport.trim())
  .filter(Boolean);
if (!socketTransports.length) socketTransports.push("websocket");

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"], credentials: true },
  transports: socketTransports,
  pingInterval: 25000,
  pingTimeout: 60000,
});

io.adapter(createAdapter(socketPubClient, socketSubClient));
io.setMaxListeners(20);

global.io = io;

global.emitWalletUpdate = async (userId) => {
  try {
    const wallet = await Wallet.findOne({ userId }).lean();
    if (!wallet) return;
    io.to(`user:${userId}`).emit("wallet:update", wallet);
  } catch (err) {
    console.error("❌ Error emitWalletUpdate:", err);
  }
};

io.ubicacionesMotoristas = {};

// ============================
// 🔹 WORKERS
// ============================
require("./worker/matching.worker");

// ============================
// 🔹 MIDDLEWARES
// ============================
app.use(express.json());
app.use(cors({ 
  origin: "*", 
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'] // ✅ CORREGIDO: Dentro del objeto cors
}));


app.use((req, res, next) => {
  res.setHeader('ngrok-skip-browser-warning', 'true');
  next();
});

app.get("/healthz", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "bego",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ============================
// 🔹 STATIC + FRONT
// ============================

const driverPath = path.resolve(__dirname, "../../front-driver/www");
const pasajeroPath = path.resolve(__dirname, "../../front/www");

app.use("/driver", express.static(driverPath));
app.use(express.static(pasajeroPath));

app.get("/driver/*", (req, res) => {
  res.sendFile(path.join(driverPath, "index.html"));
});

app.get("/", (req, res) => {
  res.sendFile(path.join(pasajeroPath, "index.html"));
});

// ============================
// 🔹 ROUTES (API)
// ============================

app.use("/admin/queues", serverAdapter.getRouter());

app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/wallet", require("./routes/wallet"));
app.use("/api/dashboard", require("./routes/dashboard"));
app.use("/api/admin", require("./routes/admin.users"));
app.use("/api/recargas", require("./routes/recargas"));
app.use("/api/pagos", require("./routes/pagos"));
app.use("/api/webhook", require("./routes/webhook"));
app.use("/api/driver/auth", require("./routes/driver.auth"));
app.use("/api/pagos", shareRoutes);
app.use("/api/viajes", require("./routes/actividad"));
app.use("/api/cities", require("./routes/cities"));
app.use("/api/ruta", require("./routes/ruta"));

// ============================
// 🔹 TRACK
// ============================

const trackPath = path.join(process.cwd(), "../front/www/track");

app.use("/track", express.static(trackPath));

app.get("/track/:token", (req, res) => {
  res.sendFile(path.join(trackPath, "index.html"));
});


app.use("/api/*", (req, res) => {
  res.status(404).json({ 
    error: "Ruta de API no encontrada",
    path: req.originalUrl 
  });
});


// ============================
// 🔥 SPA FALLBACK (ÚLTIMO SIEMPRE)
// ============================

app.get("*", (req, res) => {
  res.sendFile(path.join(pasajeroPath, "index.html"));
});

// ============================
// 🔹 SOCKET AUTH
// ============================
io.use((socket, next) => {
  if (socket.handshake.auth?.tracking) return next();
  return require("./middleware/authSocket")(socket, next);
});

// ============================
// 🔹 SOCKET MODULES
// ============================
const viajesSocket = require("./sockets/viajes/viajes.socket");
const soporteSocket = require("./sockets/soporte.socket");
const initMotoristaCola = require("./sockets/viajes/motorista/motorista.cola");

// ============================
// 🔹 CONNECTION HANDLER
// ============================
io.on("connection", async (socket) => {
  console.log("🧠 NUEVA CONEXIÓN:", socket.id);

  if (socket.handshake.auth?.tracking) {
    trackSocket(io, socket);
    return;
  }

  if (!socket.user) return socket.disconnect(true);

  const user = socket.user;
  const userId = user._id.toString();

  socket.setMaxListeners(20);

  // 🔹 Update user online (no bloquea si falla)
  User.findByIdAndUpdate(userId, {
    socketId: socket.id,
    online: true,
  }).catch(() => {});

  // ============================
  // 📡 MANEJO DE SALAS DINÁMICAS
  // ============================
  socket.on("join-room", async (room) => {
    try {
      
      // 🔹 Rooms normales
      if (!room.startsWith("track:")) {
        socket.join(room);
        console.log(`📡 ${socket.id} joined ${room}`);
        return;
      }
      
      // ============================
      // 🚀 TRACK ROOM
      // ============================
      
      const viajeId = room.split(":")[1];
        
        /*************************************************
         * 🔥 CTX ROBUSTO
        *************************************************/
       
       let ctx = null;
       
       // 1. Intentar Redis
       const ctxRaw = await redis.get(`viaje:ctx:${viajeId}`);
       
       if (ctxRaw) {
         try {
           ctx = JSON.parse(ctxRaw);
          } catch {
            ctx = null;
          }
        }
        
        // 2. Validar integridad REAL
        const ctxCompleto =
        ctx &&
        ctx.estado &&
        (
          (
            ["asignado", "llego"].includes(ctx.estado) &&
            ctx.origen
          ) ||
          (
            ctx.estado === "en_curso" &&
            ctx.destino
          ) ||
          (
            ctx.estado === "reservado" &&
            ctx.proximoDestino
          )
        );
        
        // 3. Fallback DB si Redis está roto/incompleto
        if (!ctxCompleto) {
          
          const viaje = await Viaje.findById(viajeId)
          .select("estado origen destino motorista")
          .lean();
          
          if (!viaje) {
            console.log("⚠️ Viaje inexistente para sync");
            return;
          }
          
          ctx = {
            estado: viaje.estado,
            origen: viaje.origen || null,
            destino: viaje.destino || null,
            motoristaId: viaje.motorista?.toString() || null,
            proximoDestino:
            viaje.estado === "asignado"
            ? viaje.origen
            : viaje.estado === "en_curso"
            ? viaje.destino
            : null
          };
          
          // 🔥 REHIDRATAR REDIS
          await redis.set(
            `viaje:ctx:${viajeId}`,
            JSON.stringify(ctx),
            "EX",
            600
          );
          
          console.log("♻️ CTX rehidratado desde DB");
        }

        /*************************************************
         * 📍 ÚLTIMA POSICIÓN DEL MOTORISTA
        *************************************************/
       
       let lat = null;
       let lng = null;
       
       if (ctx.motoristaId) {
         
         // 1. Redis cache rápida
         const posRaw = await redis.get(
           `motorista:pos:${ctx.motoristaId}`
          );
          
          if (posRaw) {
            try {
              const pos = JSON.parse(posRaw);
              
              lat = pos.lat;
              lng = pos.lng;
              
            } catch {}
          }
          
          // 2. Fallback hash Redis
          if (lat == null || lng == null) {
            
            const mData = await redis.hgetall(
              `motorista:data:${ctx.motoristaId}`
            );
            
            if (mData?.lat && mData?.lng) {
              lat = parseFloat(mData.lat);
              lng = parseFloat(mData.lng);
            }
          }
        }
        
        /*************************************************
         * 🚀 EMIT TRACK SOLO SI CTX ES VÁLIDO
        *************************************************/
       
       if (
         (["asignado", "llego"].includes(ctx.estado) && !ctx.origen) ||
         (ctx.estado === "en_curso" && !ctx.destino)
        ) {
          console.log("⏳ Sync omitido: ctx incompleto");
          return;
        }

        if (!socket.rooms.has(room)) {
          socket.join(room);
          console.log(`📡 ${socket.id} joined ${room}`);
        }
        
        socket.emit("track:posicion", {
          viajeId,
          lat,
          lng,
          estado: ctx.estado,
          origen: ctx.origen,
          destino: ctx.destino,
          proximoDestino:
          ["asignado", "llego"].includes(ctx.estado)
          ? ctx.origen
          : ctx.estado === "en_curso"
          ? ctx.destino
          : ctx.proximoDestino || null
        });
        
        console.log(`🚀 Sync consistente enviado a ${socket.id}`);
      
      
    } catch (err) {
      console.error("❌ Error en join-room:", err);
    }
  });

// ============================
// 🔹 MOTORISTA SNAPSHOT
// ============================
if (user.rol === "motorista") {

  socket.join("motoristas");

  initMotoristaCola(io, socket, userId);

  try {
    const Viaje = require("./models/Viaje");
    const redisKey = `motorista:data:${userId}`;

    // 🔥 Leemos todo en paralelo (más eficiente)
    const [viajeActualId, reservaId, motoristaData] = await Promise.all([
      redis.hget(redisKey, "viajeActualId"),
      redis.hget(redisKey, "viajeReservadoId"),
      redis.hgetall(redisKey)
    ]);

   // ==========================================
   // 🚗 RECOVERY VIAJE ACTIVO
   // ==========================================
   if (viajeActualId) {
     const viaje = await Viaje.findById(viajeActualId).lean();
     
     // 🛡️ FILTRO CRÍTICO: Solo sincronizar si el viaje NO está finalizado ni cancelado
     const estadosActivos = ["asignado", "llego", "en_curso", "ofertando"];
     
     if (viaje && estadosActivos.includes(viaje.estado)) {
       console.log("♻️ Recovery viaje activo:", viajeActualId, "Estado:", viaje.estado);
       
       socket.join(`viaje:${viajeActualId}`);
       
       socket.emit("sync-viaje", {
         viajeId: viaje._id,
         estado: viaje.estado,
         origen: viaje.origen,
         destino: viaje.destino,
         precio: viaje.precio,
         pasajero: viaje.pasajero,
        });
        // ... resto del código de ubicación
      } else {
        // 🧹 LIMPIEZA: Si el viaje ya expiró o se finalizó mientras el server estaba caído
        console.log(`⚠️ Viaje ${viajeActualId} ya no está activo (${viaje?.estado}). Limpiando Redis.`);
        await redis.hset(redisKey, "viajeActualId", "");
        await redis.hset(redisKey, "estadoInterno", "disponible");
        // Opcional: avisar al front que limpie
        socket.emit("viaje:finalizado-automatico"); 
      }
    }

    // ==========================================
    // 🔔 RECOVERY DE OFERTA PENDIENTE
    // ==========================================
    // Buscamos si hay alguna oferta "volando" para este motorista en Redis
    const keysOfertas = await redis.keys(`viaje:oferta:pendiente:*:${userId}`);
    
    if (keysOfertas.length > 0) {
      const dataOfertaRaw = await redis.get(keysOfertas[0]);
      if (dataOfertaRaw) {
        const dataOferta = JSON.parse(dataOfertaRaw);
        const tiempoRestante = dataOferta.expira - Date.now();
        
        if (tiempoRestante > 500) { // Si aún le quedan más de 0.5 seg
          console.log(`✨ Re-sincronizando oferta pendiente para ${userId}`);
          socket.emit("viaje:oferta", {
            ...dataOferta,
            ttl: tiempoRestante // El front recibe el tiempo real que queda
          });
        }
      }
    }

    // ==========================================
    // 📌 RECOVERY RESERVA (B2B)
    // ==========================================
    if (reservaId) {

      console.log("📌 Recovery reserva:", reservaId);

      socket.emit("sync-reserva", {
        viajeId: reservaId
      });
    }

  } catch (err) {
    console.error("❌ Error en snapshot recovery motorista:", err);
  }

  } else {
    socket.join("pasajeros");
  }

  // ============================
  // 🔹 WALLET ASYNC
  // ============================
  Wallet.findOne({ userId })
    .lean()
    .then((wallet) => {
      if (wallet) socket.emit("wallet:update", wallet);
    })
    .catch(() => {});

  // ============================
  // 🔹 SOCKET MODULES
  // ============================
  viajesSocket(io, socket);
  soporteSocket(io, socket);

  // ============================
  // 🔹 DISCONNECT
  // ============================
  socket.on("disconnect", async () => {
    console.log(`🔌 Usuario desconectado: ${userId}`);

    User.findByIdAndUpdate(userId, {
      socketId: null,
      online: false,
    }).catch(() => {});
  });
});

// ============================
// 🔹 DATABASE + START
// ============================
mongoose.set("bufferCommands", false);
const shouldRunSingletonJobs =
  !process.env.NODE_APP_INSTANCE || process.env.NODE_APP_INSTANCE === "0";

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("🟢 MongoDB conectado");

    // 🔹 Limpieza estados huérfanos al iniciar
    if (shouldRunSingletonJobs) {
      try {
        await limpiarEstadosHuerfanos();
      } catch (e) {
        console.error("⚠️ Error en cleanup:", e);
      }
    }

    // 🔹 Workers después de DB
    if (shouldRunSingletonJobs) {
      const { initMatchingWorker } = require("./worker/matching.worker");
      initMatchingWorker();
      console.log("👷 Workers de BullMQ inicializados");
    } else {
      console.log("Workers singleton omitidos en esta instancia PM2");
    }

    const PORT = process.env.PORT || 3000;

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`🔥 Backend activo en puerto ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Error fatal al iniciar:", err);
    process.exit(1);
  });
