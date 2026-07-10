const { normalizePhotoUrl } = require("./photoUrl");

module.exports = function formatMotorista(motoristaDoc) {
  if (!motoristaDoc) return null;

  // Sanitizar el nodo vehiculo para evitar errores de lectura de propiedades indefinidas
  const v = motoristaDoc.vehiculo && typeof motoristaDoc.vehiculo === "object" 
    ? motoristaDoc.vehiculo 
    : {};

  return {
    id: motoristaDoc._id,
    nombre: motoristaDoc.nombre || "Motorista",
    apellido: motoristaDoc.apellido || "",
    telefono: motoristaDoc.telefono || null,
    foto: normalizePhotoUrl(motoristaDoc.foto || motoristaDoc.avatar || motoristaDoc.photo),
    calificacion: motoristaDoc.rating || motoristaDoc.calificacion || 5.0,
    rating: motoristaDoc.rating || motoristaDoc.calificacion || 5.0,
    ratingCount: motoristaDoc.ratingCount || 0,
    vehiculo: {
      marca: v.marca || motoristaDoc.vehiculoMarca || "",
      modelo: v.modelo || motoristaDoc.vehiculoModelo || "",
      color: v.color || motoristaDoc.vehiculoColor || "",
      placa: v.placa || motoristaDoc.placa || ""
    },
    ubicacion: {
      lat: motoristaDoc.ubicacion?.lat ?? null,
      lng: motoristaDoc.ubicacion?.lng ?? null
    }
  };
};
