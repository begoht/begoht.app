const state = {
  map: null,
  socket: null,
  viajeId: null,
  user: null,
};

// ===============================
// 👂 LISTENERS
// ===============================
const listeners = {};

// ===============================
// 📢 SUBSCRIBE
// ===============================
function subscribe(key, callback) {
  if (!listeners[key]) {
    listeners[key] = new Set();
  }

  listeners[key].add(callback);

  // unsubscribe automático
  return () => {
    listeners[key].delete(callback);
  };
}

// ===============================
// 🔄 SET STATE
// ===============================
function setState(key, value) {
  const oldValue = state[key];

  if (oldValue === value) return;

  state[key] = value;

  // notificar cambios
  if (listeners[key]) {
    listeners[key].forEach(fn => {
      try {
        fn(value, oldValue);
      } catch (e) {
        console.warn(`⚠️ Error en listener de ${key}:`, e);
      }
    });
  }
}

// ===============================
// 📥 GET STATE
// ===============================
function getState(key) {
  return state[key];
}

// ===============================
// 🧹 RESET (OPCIONAL)
// ===============================
function resetState() {
  Object.keys(state).forEach(key => {
    setState(key, null);
  });
}

// ===============================
// 📦 EXPORT
// ===============================
export const AppState = {
  get: getState,
  set: setState,
  subscribe,
  reset: resetState,
};