// viajes.socket.js o donde manejes el io.on("connection")
const { redis } = require("../config/redis"); // Asegúrate de importar redis

module.exports = (io, socket) => {
  
  // ⚡ ESTO ES LO QUE FALTA: Sincronizar motoristaId con el socket.id actual
  socket.on("registrar-motorista", async (motoristaId) => {
    if (!motoristaId) return;
    
    // Guardamos en Redis el socketId actual para que el despacho sepa a quién llamar
    await redis.hset(`motorista:data:${motoristaId}`, "socketId", socket.id);
    
    // Opcional: Marcarlo como disponible si no lo estaba
    await redis.hset(`motorista:data:${motoristaId}`, "disponible", "true");
    
    console.log(`✅ Motorista ${motoristaId} registrado con socket ${socket.id}`);
  });

  socket.on("unirse-viaje", (viajeId) => {
    socket.join(viajeId);
  });

  socket.on("ubicacion-motorista", ({ viajeId, lat, lng, estado }) => {
    io.to(viajeId).emit("ubicacion-motorista", { lat, lng, estado });
  });

  // Limpieza al desconectar (opcional pero recomendado)
  socket.on("disconnect", async () => {
     // Aquí podrías marcarlo como no disponible si quisieras
     console.log(`❌ Socket desconectado: ${socket.id}`);
  });
};