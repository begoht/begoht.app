// ===============================
// 🧠 ESTADO GLOBAL DE LA APP
// ===============================

export const AppState = {
    socket: null,
    user: null,

    // 🚗 VIAJE GLOBAL
    viaje: {
        activo: false,
        estado: null, // "buscando" | "asignado" | "en_curso"
        motorista: null,
        origen: null,
        destino: null
    }
};