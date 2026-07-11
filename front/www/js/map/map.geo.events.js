import { cityConfig } from "./config/index.js?v=20260624-cordoba-gps";

let ubicacionButtonBound = false;
let recenterButtonBound = false;

export function bindUbicacionButton(map, { tomarUbicacionActual, setInputInicio }) {
  const btn = document.getElementById("btnUbicacion");
  if (!btn || ubicacionButtonBound) return;

  ubicacionButtonBound = true;
  const label = btn.textContent || "Usar ubicacion actual";

  btn.addEventListener("click", async () => {
    btn.disabled = true;
    btn.textContent = "Ubicando...";

    try {
      const ok = await tomarUbicacionActual(map, { center: true, fromButton: true });
      if (!ok) {
        setInputInicio(`Activa GPS real dentro de ${cityConfig.name}`, { placeholder: true });
      }
    } catch (err) {
      console.warn("GPS manual:", err);
      setInputInicio("No pudimos tomar tu GPS. Revisa permisos de ubicacion.", { placeholder: true });
    } finally {
      btn.disabled = false;
      btn.textContent = label;
    }
  });
}

export function bindRecenterButton(map, { tomarUbicacionActual, centrarMapaEn, mostrarCentroServicio, getFallbackPoint }) {
  const btn = document.getElementById("btnRecentrarMapa");
  if (!btn || recenterButtonBound) return;

  recenterButtonBound = true;

  btn.addEventListener("click", async () => {
    btn.disabled = true;
    btn.classList.add("is-loading");

    try {
      const gpsOk = await tomarUbicacionActual(map, { center: true, fromButton: true });
      if (!gpsOk && !centrarMapaEn(map, getFallbackPoint())) {
        mostrarCentroServicio(map);
      }
    } catch (err) {
      console.warn("recentrar pasajero:", err);

      if (!centrarMapaEn(map, getFallbackPoint())) {
        mostrarCentroServicio(map);
      }
    } finally {
      btn.disabled = false;
      btn.classList.remove("is-loading");
    }
  });
}
