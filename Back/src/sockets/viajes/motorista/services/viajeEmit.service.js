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
            tipo: viaje.tipo || "viaje",
            idaVuelta: prepararIdaVuelta(viaje),
            paquete: prepararPaquetePasajero(viaje),
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

function prepararIdaVuelta(viaje) {
    const data = viaje.idaVuelta || null;
    if (!data) return null;

    return {
        disponible: data.disponible === true,
        solicitada: data.solicitada === true,
        estado: data.estado || "no_aplica",
        precioIda: Number(data.precioIda || 0),
        precioVuelta: Number(data.precioVuelta || 0),
        precioTotal: Number(data.precioTotal || viaje.precio || 0),
        distanciaIdaKm: Number(data.distanciaIdaKm || 0),
        distanciaTotalKm: Number(data.distanciaTotalKm || viaje.distanciaKm || 0),
        duracionIdaMin: Number(data.duracionIdaMin || 0),
        duracionTotalMin: Number(data.duracionTotalMin || viaje.duracionMin || 0),
        retornoPendienteAt: data.retornoPendienteAt || null,
        retornoIniciadoAt: data.retornoIniciadoAt || null,
        retornoCanceladoAt: data.retornoCanceladoAt || null,
        retornoCompletadoAt: data.retornoCompletadoAt || null,
        canceladoPor: data.canceladoPor || null
    };
}

function prepararPaquetePasajero(viaje) {
    if ((viaje.tipo || "viaje") !== "envio" || !viaje.paquete) return null;

    return {
        pesoKg: viaje.paquete.pesoKg,
        descripcion: viaje.paquete.descripcion || "",
        instrucciones: viaje.paquete.instrucciones || "",
        codigoEntrega: viaje.paquete.codigoEntrega || null
    };
}
