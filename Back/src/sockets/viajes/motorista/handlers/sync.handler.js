const Viaje = require("../../../../models/Viaje");
const User = require("../../../../models/User");
const { redis } = require("../../../../config/redis");

const snapshotMotorista = require(
    "../services/motoristaSnapshot.service"
);
const { getDriverEarningsForViaje } = require("../../../../services/driverEarnings.service");
const { prepararIdaVueltaPayload } = require("../../../../services/idaVuelta.service");
const { normalizePhotoUrl } = require("../../../../utils/photoUrl");

module.exports = (io, socket) => {
    return async () => {
        try {
            const motoristaId = socket.user._id.toString();

            const snapshot = await snapshotMotorista(
                motoristaId
            );

            if (!snapshot) {
                return socket.emit("sync-viaje", {
                    estado: "libre"
                });
            }

            if (snapshot.viajeActualId) {
                const snapViaje = await redis.get(
                    `viaje:snapshot:${snapshot.viajeActualId}`
                );

                const viaje = snapViaje
                    ? JSON.parse(snapViaje)
                    : await Viaje.findById(
                          snapshot.viajeActualId
                      ).lean();

                socket.emit("sync-viaje", await sanitizarViajeMotorista(viaje));
            }

            if (
                snapshot.viajeReservadoId &&
                snapshot.viajeReservadoId !== "null"
            ) {
                socket.emit("sync-reserva", {
                    viajeId: snapshot.viajeReservadoId
                });
            }
        } catch (error) {
            console.error("❌ sync:", error);
        }
    };
};

async function sanitizarViajeMotorista(viaje) {
    if (!viaje) {
        return viaje;
    }

    const earnings = await getDriverEarningsForViaje(viaje);
    const pasajero = await prepararPasajeroMotorista(viaje.pasajero);
    if ((viaje.tipo || "viaje") !== "envio" || !viaje.paquete) {
        return {
            ...viaje,
            pasajero,
            pasajeroNombre: pasajero?.nombreCompleto || null,
            pasajeroTelefono: pasajero?.telefono || null,
            idaVuelta: prepararIdaVueltaPayload(viaje),
            ...earnings
        };
    }

    return {
        ...viaje,
        pasajero,
        pasajeroNombre: pasajero?.nombreCompleto || null,
        pasajeroTelefono: pasajero?.telefono || null,
        idaVuelta: prepararIdaVueltaPayload(viaje),
        ...earnings,
        paquete: {
            pesoKg: viaje.paquete.pesoKg,
            descripcion: viaje.paquete.descripcion || "",
            instrucciones: viaje.paquete.instrucciones || "",
            codigoEntregaRequerido: true
        }
    };
}

async function prepararPasajeroMotorista(pasajero) {
    if (!pasajero) return null;

    if (typeof pasajero === "object" && pasajero.nombre) {
        const nombreCompleto = [pasajero.nombre, pasajero.apellido]
            .filter(Boolean)
            .join(" ")
            .trim();

        return {
            id: pasajero._id || pasajero.id || null,
            nombre: pasajero.nombre || "",
            apellido: pasajero.apellido || "",
            nombreCompleto: nombreCompleto || pasajero.nombre || "",
            telefono: pasajero.telefono || "",
            foto: normalizePhotoUrl(pasajero.foto || pasajero.avatar || pasajero.photo),
            rating: pasajero.rating || null
        };
    }

    const user = await User.findById(pasajero)
        .select("nombre apellido telefono foto rating")
        .lean();

    if (!user) return { id: pasajero.toString?.() || String(pasajero) };

    const nombreCompleto = [user.nombre, user.apellido]
        .filter(Boolean)
        .join(" ")
        .trim();

    return {
        id: user._id,
        nombre: user.nombre || "",
        apellido: user.apellido || "",
        nombreCompleto: nombreCompleto || user.nombre || "",
        telefono: user.telefono || "",
        foto: normalizePhotoUrl(user.foto || ""),
        rating: user.rating || null
    };
}
