const initMotoristaCola = require("./motorista.cola");
const { redis } = require("../../../config/redis");
const ubicacionHandler = require("./ubicacion/index");
const viajesHandler = require("./motorista.viajes");
const Viaje = require("../../../models/Viaje");

module.exports = (io, socket) => {
    const motoristaId = socket.user.id.toString();

    if (!global.motoristasActivos) global.motoristasActivos = new Map();
    initMotoristaCola(io, socket, motoristaId);

    global.motoristasActivos.set(motoristaId, {
        socketId: socket.id,
        lat: null, lng: null,
        disponible: true, conectado: true,
        lastUpdate: Date.now(),
    });

    socket.join(`motorista:${motoristaId}`);
    socket.join(`motorista:${motoristaId}`); 

    redis.set(
        `motorista:online:${motoristaId}`,
        "1",
        "EX",
        60
    ).catch(err => {
        console.error("❌ online presence:", err);
    });

    (async () => {
        try {
            // 1️⃣ Buscamos todos los viajes pendientes (Ordenados por antigüedad)
            const viajesPendientes = await Viaje.find({
                motorista: motoristaId,
                estado: { $in: ["reservado", "asignado", "llego", "en_curso"] }
            }).sort({ createdAt: 1 });

            if (viajesPendientes.length > 0) {
                console.log(`♻️ Recovery: Sincronizando ${viajesPendientes.length} viajes para ${motoristaId}`);
                
                let principalEncontrado = false;

                for (const viaje of viajesPendientes) {
                    socket.join(`viaje:${viaje._id}`);

                    // Determinamos el tipo dinámicamente
                    let tipo = "reserva";
                    
                    // El primero que esté en un estado activo es el principal
                    if (!principalEncontrado && ["asignado", "llego", "en_curso"].includes(viaje.estado)) {
                        tipo = "principal";
                        principalEncontrado = true;
                    } 
                    // Si terminamos el bucle y ninguno era "activo", el más viejo (índice 0) es el principal
                    else if (!principalEncontrado && viaje === viajesPendientes[0]) {
                        tipo = "principal";
                        principalEncontrado = true;
                    }

                    // Enviamos el sync con toda la data necesaria
                    socket.emit("sync-viaje", {
                        viajeId: viaje._id.toString(),
                        estado: viaje.estado,
                        tipo: tipo,
                        origen: viaje.origen,
                        destino: viaje.destino,
                        precio: viaje.precio,
                        pasajero: viaje.pasajero
                    });

                    // Actualizar Redis para que el resto del sistema sepa que el motorista está en este viaje
                    if (tipo === "principal") {
                        await redis.hset(`motorista:data:${motoristaId}`, "viajeActualId", viaje._id.toString());
                    }
                }
            }

            // 2️⃣ Recovery de Oferta (Si hay algo en el aire)
            const ofertaKeyPattern = `viaje:oferta:pendiente:*:${motoristaId}`;
            const keys = await redis.keys(ofertaKeyPattern);
            if (keys.length > 0) {
                const ofertaData = await redis.get(keys[0]);
                if (ofertaData) {
                    const oferta = JSON.parse(ofertaData);
                    socket.emit("viaje:oferta", { ...oferta, isRecovery: true });
                }
            }
        } catch (err) {
            console.error("❌ Recovery Error:", err);
        }
    })();

    ubicacionHandler(io, socket, motoristaId);
    viajesHandler(io, socket, motoristaId);
};