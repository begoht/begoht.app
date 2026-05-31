module.exports = async ({
    io,
    viaje,
    motoristaId,
    estado,
    data,
    snapshot
}) => {
    io.to(`viaje:${viaje._id}`).emit(
        "viaje-asignado",
        {
            viajeId: viaje._id,
            estado,
            origen: viaje.origen,
            destino: viaje.destino,
            precio: viaje.precio,
            distanciaKm: viaje.distanciaKm,
            duracionMin: viaje.duracionMin,
            metodoPago: viaje.metodoPago,
            estadoPago: viaje.estadoPago,
            motorista: {
                id: motoristaId,
                nombre: data.nombre || "Conductor",
                lat: snapshot?.lat || 0,
                lng: snapshot?.lng || 0,
                vehiculo: data.vehiculo || "",
                placa: data.placa || ""
            }
        }
    );
};
