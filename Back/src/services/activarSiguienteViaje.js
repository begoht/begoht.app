const Viaje = require("../models/Viaje");
const User = require("../models/User");
const { redis } = require("../config/redis");
const { actualizarSnapshotMotorista } = require("../sockets/viajes/motorista/motoristaSnapshot.service");
const actualizarContextoViaje = require("../sockets/viajes/motorista/services/viajeContext.service");
const { getDriverEarningsForViaje } = require("./driverEarnings.service");
const { normalizePhotoUrl } = require("../utils/photoUrl");

const activarSiguienteViaje = async (io, socket, motoristaId) => {
    let lockAcquired = false;
    try {
        const lock = await redis.set(`lock:activar:${motoristaId}`, "1", "NX", "PX", 5000);
        if (!lock) return null;
        lockAcquired = true;

        const siguiente = await Viaje.findOneAndUpdate(
            {
                motorista: motoristaId,
                estado: "reservado",
                canceladoAt: { $exists: false }
            },
            { 
                $set: { 
                    estado: "asignado", 
                    motoristaSocket: socket?.id || "", 
                    asignadoEn: new Date() 
                } 
            },
            { sort: { createdAt: 1 }, new: true }
        );

        if (!siguiente) {
            // Si no hay reserva, limpiamos todo y dejamos al motorista LIBRE
            await redis.multi()
                .srem("motoristas:ocupados", motoristaId)
                .sadd("motoristas:disponibles", motoristaId)
                .hset(`motorista:data:${motoristaId}`, {
                    disponible: "true",
                    viajeActualId: "",
                    estadoInterno: "libre",
                    lastUpdate: Date.now().toString()
                })
                .del(`motorista:snapshot:${motoristaId}`) // 🧹 Limpieza de snapshot
                .exec();
            return null;
        }

        // 🚀 1. ACTUALIZAR SNAPSHOT (NUEVA FUENTE DE VERDAD)
        await actualizarSnapshotMotorista(motoristaId, {
            viajeActualId: siguiente._id.toString(),
            viajeReservadoId: "", // Ya no es una reserva, es el activo
            estadoInterno: "viajando",
            estadoViaje: "asignado"
        });

        // 🚀 2. ACTUALIZAR REDIS LEGACY (COMPATIBILIDAD)
        await redis.hset(`motorista:data:${motoristaId}`, {
            viajeActualId: siguiente._id.toString(),
            estadoInterno: "viajando",
            disponible: "false"
        });

        await actualizarContextoViaje(siguiente._id.toString(), {
            estado: "asignado",
            origen: siguiente.origen || null,
            destino: siguiente.destino || null,
            proximoDestino: siguiente.origen || null,
            motoristaId
        });
        
        if (socket) {
            socket.join(`viaje:${siguiente._id}`);
        }

        const motoristaDB = await User.findById(motoristaId).select("nombre telefono vehiculo rating foto").lean();
        const driverEarnings = await getDriverEarningsForViaje(siguiente);

        const payload = {
            viajeId: siguiente._id.toString(),
            estado: "asignado",
            origen: siguiente.origen,
            destino: siguiente.destino,
            precio: siguiente.precio,
            ...driverEarnings,
            distanciaKm: siguiente.distanciaKm,
            duracionMin: siguiente.duracionMin,
            metodoPago: siguiente.metodoPago,
            estadoPago: siguiente.estadoPago,
            proximoDestino: siguiente.origen,
            mensaje: "Tu motorista ya va hacia ti.",
            pasajero: {
                id: siguiente.pasajero,
                nombre: siguiente.pasajeroNombre || "Pasajero"
            }
        };

        // Notificaciones
        io.to(`user:${siguiente.pasajero}`).emit("viaje-asignado", { 
            ...payload, 
            motorista: {
                id: motoristaId,
                nombre: motoristaDB?.nombre || "Motorista",
                placa: motoristaDB?.vehiculo?.placa || "N/A",
                foto: normalizePhotoUrl(motoristaDB?.foto || "")
            } 
        });

        if (socket) {
            socket.emit("iniciar-viaje-siguiente", payload);
        } else {
            io.to(`motorista:${motoristaId}`).emit("iniciar-viaje-siguiente", payload);
        }
        
        return siguiente;

    } catch (err) {
        console.error("❌ ERROR en activarSiguienteViaje:", err);
        return null;
    } finally {
        if (lockAcquired) {
            await redis.del(`lock:activar:${motoristaId}`);
        }
    }
};

module.exports = { activarSiguienteViaje };
