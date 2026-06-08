import { isDriverOnline, updateDriverPosition } from "./driver.status.js?v=20260608-gps-accept";

let socketInstance = null;

export function initSocket(serverUrl, token) {

  if (socketInstance) return socketInstance;

  socketInstance = io(serverUrl, {
    auth: { token, role: "motorista" },
    transports: ["websocket"],
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
    enviarPosicionActual();
  });
  
  socketInstance.on("connect_error", (err) => {
    console.error("❌ Error conexión:", err.message);
    
    if (err.message?.includes("jwt") || err.message?.includes("token")) {
      localStorage.clear();
      window.location.href = "login.html";
    }
  });
  
  function enviarPosicionActual() {
    if (!navigator.geolocation) return;
    
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const heading = Number.isFinite(pos.coords.heading) ? pos.coords.heading : null;
        updateDriverPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
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
