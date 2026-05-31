(function () {
  const PROD_URL = "https://bego.com.ht";
  const DEV_URL = "https://bego.com.ht";

  function getServerUrl() {
    const hostname = window.location.hostname;
    const origin = window.location.origin;

    console.log("Host detectado:", hostname);

    // Túneles (ngrok, cloudflare, localtunnel)
    if (
      hostname.includes("ngrok") ||
      hostname.includes("trycloudflare") ||
      hostname.includes("loca.lt")
    ) {
      console.log("Entorno tunel detectado");
      return origin;
    }

    // App móvil
    if (window.Capacitor || window.cordova) {
      console.log("App motorista movil detectada");
      return PROD_URL;
    }

    // Desarrollo local
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      console.log("Desarrollo local detectado");
      return DEV_URL;
    }

    // Producción
    console.log("Entorno de produccion");
    return PROD_URL;
  }

  window.getServerUrl = getServerUrl;
})();