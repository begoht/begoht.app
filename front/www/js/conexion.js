export function getServerUrl() {
  const hostname = window.location.hostname;
  const origin = window.location.origin;
  const protocol = window.location.protocol;
  const PROD_URL = "https://bego.com.ht";
  const DEV_URL = "http://localhost:3000";
  const isNativeShell =
    !!(window.Capacitor || window.cordova) ||
    protocol === "capacitor:" ||
    protocol === "file:" ||
    origin === "https://localhost";

  console.log("Host detectado:", hostname);

  if (isNativeShell) {
    console.log("App movil detectada");
    return PROD_URL;
  }

  if (hostname.includes("ngrok") || hostname.includes("trycloudflare") || hostname.includes("loca.lt")) {
    console.log("Entorno tunel detectado");
    return origin;
  }

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    console.log("Desarrollo local detectado");
    return DEV_URL;
  }

  console.log("Entorno de produccion");
  return origin || PROD_URL;
}
