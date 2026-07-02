let socketRef = null;
let recoveryInFlight = null;
let lastRecoveryAt = 0;

export function initOfferRecovery(socket) {
  socketRef = socket || socketRef;
  if (!socketRef || socketRef.__offerRecoveryBound) {
    return recoverPendingOffer(socketRef, { reason: "startup" });
  }

  socketRef.__offerRecoveryBound = true;
  socketRef.on("connect", () => {
    recoverPendingOffer(socketRef, { reason: "socket-connect" });
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      recoverPendingOffer(socketRef, { reason: "visibility" });
    }
  });

  window.addEventListener("pageshow", () => {
    recoverPendingOffer(socketRef, { reason: "pageshow" });
  });

  const app = window.Capacitor?.Plugins?.App;
  app?.addListener?.("appStateChange", ({ isActive } = {}) => {
    if (isActive) recoverPendingOffer(socketRef, { reason: "app-resume" });
  }).catch?.(() => {});

  return recoverPendingOffer(socketRef, { reason: "startup", force: true });
}

export function recoverPendingOffer(
  socket = socketRef,
  { reason = "manual", force = false } = {}
) {
  socketRef = socket || socketRef;
  if (!socketRef?.connected) return Promise.resolve(null);
  if (recoveryInFlight) return recoveryInFlight;

  const now = Date.now();
  if (!force && now - lastRecoveryAt < 250) return Promise.resolve(null);
  lastRecoveryAt = now;

  recoveryInFlight = new Promise((resolve) => {
    let settled = false;
    const finish = (oferta = null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);

      if (oferta && Number(oferta.expira) > Date.now()) {
        window.dispatchEvent(new CustomEvent("driver:offer-recovered", {
          detail: oferta,
        }));
        resolve(oferta);
        return;
      }

      resolve(null);
    };

    const timeout = setTimeout(() => finish(null), 4500);
    socketRef.emit("driver:recover-offer", { reason }, (response = {}) => {
      finish(response?.ok ? response.oferta : null);
    });
  }).finally(() => {
    recoveryInFlight = null;
  });

  return recoveryInFlight;
}
