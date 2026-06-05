const User = require("../../../../models/User");
const { redis } = require("../../../../config/redis");

module.exports = async (motoristaId, socket) => {
    try {
        // ✅ UNIFICADO: Usamos 'motorista:data' para que coincida con el core de viajes
        const redisKey = `motorista:data:${motoristaId}`;
        let userData = await redis.hgetall(redisKey);

        // Si el hash no existe o le faltan campos clave, sincronizamos desde MongoDB
        if (
            !userData ||
            Object.keys(userData).length === 0 ||
            !userData.telefono ||
            (!userData.placa && !userData.vehiculoPlaca)
        ) {
            const user = await User.findById(motoristaId).lean();

            if (user) {
                userData = {
                    nombre: user.nombre || "",
                    apellido: user.apellido || "",
                    foto: user.foto || "",
                    telefono: user.telefono || "",
                    calificacion: String(user.rating || user.calificacion || 5),
                    vehiculoMarca: user.vehiculo?.marca || "",
                    vehiculoModelo: user.vehiculo?.modelo || "",
                    vehiculoColor: user.vehiculo?.color || "",
                    placa: user.vehiculo?.placa || user.placa || ""
                };

                // Guardamos en el hash unificado
                await redis.hset(redisKey, userData);
                await redis.expire(redisKey, 86400); 
            }
        }

        // Mapeo seguro hacia el cliente de Sockets
        return {
            id: motoristaId,
            nombre: userData.nombre || (socket?.user?.nombre) || "Motorista",
            apellido: userData.apellido || "",
            foto: userData.foto || "",
            telefono: userData.telefono || "",
            calificacion: parseFloat(userData.calificacion) || 5,
            vehiculo: {
                marca: userData.vehiculoMarca || userData.marca || "",
                modelo: userData.vehiculoModelo || userData.modelo || "",
                color: userData.vehiculoColor || userData.color || "",
                placa: userData.placa || userData.vehiculoPlaca || ""
            }
        };
    } catch (e) {
        console.error("❌ Error en obtenerMotoristaInfo service:", e);
        return {
            id: motoristaId,
            nombre: "Motorista",
            apellido: "",
            foto: "",
            telefono: "",
            calificacion: 5,
            vehiculo: { marca: "", modelo: "", color: "", placa: "" }
        };
    }
};
