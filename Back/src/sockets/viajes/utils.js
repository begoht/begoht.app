const { motoristas } = require("./state");

function emitirMotoristasCercanos(io) {
  const lista = [];

  for (const m of motoristas.values()) {
    if (m.disponible && m.lat != null && m.lng != null) {
      lista.push({
        id: m.id,
        nombre: m.nombre,
        location: { lat: m.lat, lng: m.lng }
      });
    }
  }

  io.to("pasajeros").emit("motoristas-cercanos", lista);
}

module.exports = { emitirMotoristasCercanos };
