import { viajeState } from "../../viaje/viaje.state.js";

export const handleConnect = (data, socket) => {
  console.log("Re-sync pasajero detectado");

  if (viajeState.viajeId) {
    socket?.emit("join-room", `track:${viajeState.viajeId}`);
  }

  if (socket && socket.connected) {
    socket.emit("sync-pasajero", { viajeId: getStoredViajeId() });
    console.log("Peticion de sync enviada al servidor");
  }
};

function getStoredViajeId() {
  if (viajeState.viajeId) return String(viajeState.viajeId);
  try {
    const stored = JSON.parse(localStorage.getItem("viajeActivo") || "null");
    return stored?.viajeId ? String(stored.viajeId) : null;
  } catch {
    return null;
  }
}
