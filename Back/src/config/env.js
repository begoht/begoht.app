const ENV = {
  DEV: "dev",
  PROD: "prod",
};

// Detecta si es APK / móvil real
const isMobile = () => {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone/i.test(navigator.userAgent);
};

// Detecta entorno automáticamente
const getEnv = () => {
  if (typeof window === "undefined") {
    return process.env.NODE_ENV === "production" ? ENV.PROD : ENV.DEV;
  }

  const hostname = window.location.hostname;

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return ENV.DEV;
  }

  return ENV.PROD;
};

module.exports = {
  ENV,
  getEnv,
  isMobile,
};
