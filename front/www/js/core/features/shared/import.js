const BASE = (() => {
  if (window.Capacitor || window.cordova) return "";
  
  // 💡 IMPORTANTE: Si usas Live Server y abres la carpeta 'www', 
  // location.origin ya apunta ahí. No suele ser necesario /front/www.
  // Solo se usa si abres la carpeta raíz del proyecto completo.
  if (location.origin.includes("localhost") || location.origin.includes("127.0.0.1")) {
    // Si tu URL en el navegador ya muestra "www", deja esto vacío.
    // Si tu URL NO muestra "www", mantén "/front/www".
    return location.pathname.includes("/front/www") ? "/front/www" : "";
  }
  return "";
})();

export async function safeImport(initId, path, fnName) {
  // 1️⃣ Declaramos finalPath fuera del try para que el catch lo vea
  let finalPath = "";

  try {
    finalPath = path;

    // Normalizar si no es absoluta o remota
    if (!path.startsWith("/") && !path.startsWith("http")) {
      // Quitamos puntos relativos y aseguramos que cuelgue de /js/
      const cleanPath = path.replace(/^(\.\/|\.\.\/)+/, "");
      finalPath = `${BASE}/js/${cleanPath}`;
    }

    const module = await import(finalPath);

    // 🧠 Evitar race condition (Si el usuario navegó rápido a otra página)
    if (initId !== window.__initId) {
       console.warn(`⚠️ Import abortado: initId desfasado para ${finalPath}`);
       return;
    }

    if (module && typeof module[fnName] === "function") {
      module[fnName]();
    } else {
      console.warn(`⚠️ La función ${fnName} no existe en ${finalPath}`);
    }

  } catch (e) {
    // 2️⃣ Ahora finalPath sí está definido aquí
    console.error(`❌ ERROR en el import dinámico:
       Path solicitado: ${path}
       URL final calculada: ${finalPath}
       Error:`, e);
  }
}