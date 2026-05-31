import { viajeState } from "./viaje/viaje.state.js";
import { getServerUrl } from "./conexion.js";

const API = getServerUrl();

let compartiendo = false;

async function compartirViaje() {
  if (compartiendo) return;

  const viajeId = viajeState?.viajeId || window.viajeEnCursoId;
  const token = localStorage.getItem("token");

  if (!viajeId) {
    alert("No hay un viaje activo para compartir.");
    return;
  }

  if (!token) {
    alert("Tu sesion expiro. Inicia sesion para compartir el viaje.");
    return;
  }

  const btn = document.getElementById("btnCompartirViaje");
  setLoading(btn, true);

  try {
    compartiendo = true;

    const res = await fetch(`${API}/api/pagos/viaje/${viajeId}/compartir`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.url) {
      throw new Error(data?.error || "No se pudo generar el link de seguimiento.");
    }

    const mensaje = [
      "Seguimiento en tiempo real - BeGO",
      "Toca el enlace para ver el recorrido en vivo:",
      data.url
    ].join("\n\n");

    if (navigator.share) {
      await navigator.share({
        title: "Seguimiento BeGO",
        text: mensaje,
        url: data.url
      });
      return;
    }

    await copiarAlPortapapeles(data.url);
    abrirWhatsApp(mensaje);
  } catch (err) {
    console.error("Error compartiendo viaje:", err);
    alert(err.message || "No se pudo compartir el viaje.");
  } finally {
    compartiendo = false;
    setLoading(btn, false);
  }
}

async function copiarAlPortapapeles(texto) {
  if (!navigator.clipboard?.writeText) return;

  try {
    await navigator.clipboard.writeText(texto);
  } catch (err) {
    console.warn("No se pudo copiar el link:", err.message);
  }
}

function abrirWhatsApp(mensaje) {
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
  window.open(whatsappUrl, "_blank", "noopener,noreferrer");
}

function setLoading(btn, loading) {
  if (!btn) return;

  btn.disabled = loading;
  if (!btn.dataset.originalText) {
    btn.dataset.originalText = btn.innerHTML;
  }
  btn.innerHTML = loading ? "Compartiendo..." : btn.dataset.originalText;
}

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("btnCompartirViaje");
  if (btn) {
    btn.addEventListener("click", compartirViaje);
  }
});
