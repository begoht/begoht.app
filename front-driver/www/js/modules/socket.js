import { isDriverOnline, updateDriverPosition } from "./driver.status.js?v=20260624-matching-offline";
import {
  clearDriverSession,
  refreshDriverAccessToken,
} from "../auth/session.js";

let socketInstance = null;
let refreshInFlight = false;

export function initSocket(serverUrl, token) {

  if (socketInstance) return socketInstance;

  if (typeof io !== "function") {
    throw new Error("Socket.IO no esta cargado en el dispositivo");
  }

  socketInstance = io(serverUrl, {
    auth: { token, role: "motorista" },
    transports: ["websocket", "polling"],
    upgrade: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    randomizationFactor: 0.5,
    timeout: 30000
  });

  window.begoMonitorSocket?.(socketInstance, { source: "driver", channel: "main" });

  /*************************************************
   * 🔌 CONEXIÓN
   *************************************************/
  socketInstance.on("connect", () => {
    console.log("🟢 Socket conectado:", socketInstance.id);
    socketInstance.emit("wallet:subscribe");
    socketInstance.emit("driver:availability", { disponible: isDriverOnline() });
    enviarPosicionActual();
  });
  
  socketInstance.on("connect_error", async (err) => {
    console.error("❌ Error conexión:", err.message);

    if (String(err?.message || "").toLowerCase().includes("verification")) {
      clearDriverSession();
      alert("Compte en attente de verification par BeGO.");
      window.location.href = "login.html";
      return;
    }

    if (!isAuthError(err)) return;
    if (refreshInFlight) return;

    refreshInFlight = true;
    try {
      const nextToken = await refreshDriverAccessToken(serverUrl);
      socketInstance.auth = { token: nextToken, role: "motorista" };
      socketInstance.connect();
    } catch {
      clearDriverSession();
      window.location.href = "login.html";
    } finally {
      refreshInFlight = false;
    }
  });

  const closeForSecurity = (message) => {
    clearDriverSession();
    socketInstance.disconnect();
    if (message) alert(message);
    window.location.href = "login.html";
  };

  socketInstance.on("session:revoked", () => closeForSecurity("Session fermee."));
  socketInstance.on("sesion-reemplazada", () => closeForSecurity("Session ouverte sur un autre appareil."));
  socketInstance.on("driver:verification-required", (payload) =>
    closeForSecurity(payload?.message || "Compte en attente de verification.")
  );
  socketInstance.on("driver:verification-revoked", (payload) =>
    closeForSecurity(payload?.message || "Verification retiree.")
  );

  function enviarPosicionActual() {
    if (!navigator.geolocation) return;
    
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const heading = Number.isFinite(pos.coords.heading) ? pos.coords.heading : null;
        updateDriverPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
        socketInstance.emit("driver:availability", { disponible: isDriverOnline() });
        socketInstance.emit("motoristas:ubicacion", {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          heading,
          disponible: isDriverOnline()
        });
      },
      (err) => console.error("❌ Error GPS:", err),
      { enableHighAccuracy: true }
    );
  }

  /*************************************************
   * 💰 WALLET GLOBAL
   *************************************************/
  socketInstance.on("wallet:update", (w) => {
    if (!w) return;

    const saldoBox = document.getElementById("saldo");
    const saldoBloqueadoBox = document.getElementById("saldoBloqueado");
    const driverBalance = document.getElementById("driverWalletBalance");
    const driverCash = document.getElementById("driverWalletCashGain");
    const driverDebt = document.getElementById("driverWalletCommissionDebt");
    const driverLimit = document.getElementById("driverWalletCommissionLimit");

    saldoBox && (saldoBox.textContent = (w.saldo || 0).toFixed(2));
    saldoBloqueadoBox && (saldoBloqueadoBox.textContent = (w.saldoBloqueado || 0).toFixed(2));
    driverBalance && (driverBalance.textContent = `${Number(w.gananciaDisponible ?? w.saldo ?? 0).toFixed(2)} G`);
    driverCash && (driverCash.textContent = `${Number(w.gananciaEfectivo || 0).toFixed(2)} G`);
    driverDebt && (driverDebt.textContent = `${Number(w.comisionPendiente || 0).toFixed(2)} G`);
    driverLimit && (driverLimit.textContent = w.bloqueadoPorComision
      ? `Limite alcanzado: ${Number(w.comisionLimite || 0).toFixed(2)} G`
      : `Limite ${Number(w.comisionLimite || 0).toFixed(2)} G`);
    window.dispatchEvent(new CustomEvent("wallet:update", { detail: w }));
  });

  window.socket = socketInstance;

  return socketInstance;
}

function isAuthError(err) {
  const message = String(err?.message || "").toLowerCase();
  return (
    message.includes("jwt") ||
    message.includes("token") ||
    message.includes("expired") ||
    message.includes("outdated") ||
    message.includes("invalid") ||
    message.includes("verification")
  );
}
