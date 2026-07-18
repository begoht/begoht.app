import { viajeState } from "./viaje/viaje.state.js";
import { getServerUrl } from "./conexion.js";

const API = getServerUrl();

let compartiendo = false;

async function compartirViaje() {
  if (compartiendo) return;

  const viajeId = getViajeIdActivo();
  const token = getAccessToken();

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
    if (err?.name === "AbortError") return;
    console.error("Error compartiendo viaje:", err);
    alert(err.message || "No se pudo compartir el viaje.");
  } finally {
    compartiendo = false;
    setLoading(btn, false);
  }
}

function getViajeIdActivo() {
  const ids = [
    viajeState?.viajeId,
    window.viajeEnCursoId,
    window.viajeActivo?.viajeId,
    readStoredTripId("viajeActivo"),
    readStoredTripId("viajeEnCurso")
  ];

  return String(ids.find(Boolean) || "").trim();
}

function readStoredTripId(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return "";
    const parsed = JSON.parse(raw);
    return parsed?.viajeId || parsed?._id || parsed?.id || "";
  } catch {
    return localStorage.getItem(key) || "";
  }
}

function getAccessToken() {
  const raw = localStorage.getItem("token") || localStorage.getItem("BeGO_token") || "";
  const token = String(raw).trim();
  return token.startsWith("\"") && token.endsWith("\"")
    ? token.slice(1, -1)
    : token;
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
