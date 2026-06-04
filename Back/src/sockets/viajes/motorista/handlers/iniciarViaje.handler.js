const Viaje = require("../../../../models/Viaje");
const { redis } = require("../../../../config/redis");

const snapshotMotorista = require(
    "../services/motoristaSnapshot.service"
);

const updateContext = require(
    "../services/viajeContext.service"
);
const calcularETA = require("../../pasajeros/services/tracking/calcularETA");

async function guardarPuntoTrayectoria(viajeId, lat, lng) {
    const nLat = Number(lat);
    const nLng = Number(lng);

    if (!Number.isFinite(nLat) || !Number.isFinite(nLng)) return;

    const point = JSON.stringify({
        lat: nLat,
        lng: nLng,
        timestamp: new Date().toISOString()
    });

    await redis.multi()
        .rpush(`viaje:trayectoria:${viajeId}`, point)
        .ltrim(`viaje:trayectoria:${viajeId}`, -1000, -1)
        .expire(`viaje:trayectoria:${viajeId}`, 86400)
        .exec();
}

module.exports = (io, socket) => {
    return async ({ viajeId }) => {
        try {
            const motoristaId = socket.user._id.toString();

            const snap = await snapshotMotorista(motoristaId);

            if (snap?.viajeActualId !== viajeId) {
                return;
            }

            const viaje = await Viaje.findOneAndUpdate(
                {
                    _id: viajeId,
                    motorista: motoristaId,
                    estado: "llego"
                },
                {
                    $set: {
                        estado: "en_curso",
                        inicioViajeAt: new Date()
                    }
                },
                {
                    new: true
                }
            ).lean();

            if (!viaje) return;

            await redis.set(
                `viaje:destino:${viaje._id}`,
                JSON.stringify(viaje.destino),
                "EX",
                7200
            );

            await redis.hset(
                `motorista:data:${motoristaId}`,
                {
                    estadoInterno: "en_curso"
                }
            );

            await updateContext(viajeId, {
                estado: "en_curso",
                origen: viaje.origen,
                destino: viaje.destino,
                proximoDestino: viaje.destino,
                motoristaId,
                pasajeroId: viaje.pasajero?.toString() || null
            });

            const payload = {
                viajeId: viaje._id,
                estado: "en_curso",
                origen: viaje.origen,
                destino: viaje.destino,
                timestamp: Date.now()
            };

            const snapActual = await snapshotMotorista(motoristaId);
            const lat = Number(snapActual?.lat);
            const lng = Number(snapActual?.lng);

            io.to(`pasajero:${viaje.pasajero}`).emit(
                "viaje:iniciado",
                payload
            );

            socket.emit("viaje:iniciado", payload);
            socket.emit("viaje-iniciado-exito", payload);

            if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
                await guardarPuntoTrayectoria(viajeId, lat, lng);

                const calc = calcularETA({
                    motoristaLat: lat,
                    motoristaLng: lng,
                    destinoLat: viaje.destino?.lat,
                    destinoLng: viaje.destino?.lng
                });

                const trackPayload = {
                    viajeId: viaje._id,
                    lat,
                    lng,
                    estado: "en_curso",
                    origen: viaje.origen || null,
                    destino: viaje.destino || null,
                    proximoDestino: viaje.destino || null,
                    distancia: calc.distanciaKm ?? null,
                    eta: calc.eta ?? null,
                    immediate: true,
                    timestamp: Date.now()
                };

                io
                    .to(`track:${viajeId}`)
                    .to(`pasajero:${viaje.pasajero}`)
                    .emit("track:posicion", trackPayload);
            }
        } catch (error) {
            console.error("❌ iniciar:", error);
        }
    };
};
