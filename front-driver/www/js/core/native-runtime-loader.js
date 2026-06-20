(function () {
  const PROD_URL = "https://bego.com.ht";
  const LOAD_TIMEOUT_MS = 8000;

  function baseUrl() {
    try {
      if (typeof window.getServerUrl === "function") return window.getServerUrl();
    } catch {}

    return PROD_URL;
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      const timer = window.setTimeout(() => {
        script.remove();
        reject(new Error(`Timeout cargando ${src}`));
      }, LOAD_TIMEOUT_MS);

      script.src = src;
      script.async = false;
      script.onload = () => {
        window.clearTimeout(timer);
        resolve(true);
      };
      script.onerror = () => {
        window.clearTimeout(timer);
        script.remove();
        reject(new Error(`No cargo ${src}`));
      };

      document.head.appendChild(script);
    });
  }

  function loadStyleOnce(id, href) {
    if (document.getElementById(id)) return;

    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }

  async function ensureSocketIo() {
    if (typeof window.io === "function") return true;

    const sources = [
      `${baseUrl().replace(/\/$/, "")}/socket.io/socket.io.js`,
      "https://cdn.socket.io/4.7.4/socket.io.min.js"
    ];

    for (const src of sources) {
      try {
        await loadScript(src);
        if (typeof window.io === "function") return true;
      } catch (err) {
        console.warn("Socket.IO no disponible desde", src, err?.message || err);
      }
    }

    return false;
  }

  async function ensureLeaflet() {
    if (!window.L?.map) {
      loadStyleOnce("bego-leaflet-css", "https://unpkg.com/leaflet/dist/leaflet.css");

      const sources = [
        "https://unpkg.com/leaflet/dist/leaflet.js",
        "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"
      ];

      for (const src of sources) {
        try {
          await loadScript(src);
          if (window.L?.map) break;
        } catch (err) {
          console.warn("Leaflet no disponible desde", src, err?.message || err);
        }
      }
    }

    if (!window.L?.map) return false;
    if (typeof window.L?.Map?.prototype?.setBearing === "function") return true;

    const rotateSources = [
      "https://unpkg.com/leaflet-rotate@0.2.8/dist/leaflet-rotate.js",
      "https://cdn.jsdelivr.net/npm/leaflet-rotate@0.2.8/dist/leaflet-rotate.js"
    ];

    for (const src of rotateSources) {
      try {
        await loadScript(src);
        if (typeof window.L?.Map?.prototype?.setBearing === "function") return true;
      } catch (err) {
        console.warn("Rotacion Leaflet no disponible desde", src, err?.message || err);
      }
    }

    return true;
  }

  window.begoSocketIoReady = ensureSocketIo();
  window.begoLeafletReady = ensureLeaflet();
})();
