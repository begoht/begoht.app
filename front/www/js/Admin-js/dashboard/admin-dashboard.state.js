// Admin dashboard shared state and environment.
const API_BASE = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
      ? "http://localhost:3000"
      : window.location.origin;

    const state = {
      resumen: null,
      usuarios: [],
      viajes: [],
      retiros: [],
      launch: null,
      commission: null,
      walletDiscount: null,
      paymentMethods: null,
      fares: null,
      monitoring: null,
      delayReassignment: null,
      filtroViajes: "todos",
      search: "",
      charts: {}
    };
