import { getServerUrl } from "./conexion.js";

/*************************************************
 * CENTRO DE SEGURIDAD – SPA READY
 *************************************************/

export function initSeguridad() {
  console.log("🛡️ Init Seguridad");

  const boxViaje = document.getElementById("viajeActivoBox");
  const infoViaje = document.getElementById("infoViaje");

  const viajeActivo = safeJson(localStorage.getItem("viajeActivo"));

  /* =========================
     MOSTRAR VIAJE ACTIVO
  ========================= */
  function cargarViajeActivo() {
    if (!viajeActivo || viajeActivo.estado !== "en_curso") {
      console.warn("❌ No hay viaje activo");
      if (boxViaje) boxViaje.style.display = "none";
      return;
    }

    if (boxViaje && infoViaje) {
      boxViaje.style.display = "flex";
      infoViaje.textContent = `
        ${viajeActivo.motorista?.nombre || "—"} •
        ${viajeActivo.motorista?.moto || "—"} •
        ${viajeActivo.motorista?.placa || "—"}
      `;
    }
  }

  /* =========================
     COMPARTIR VIAJE
  ========================= */
  async function compartirViaje() {
    if (!viajeActivo) {
      alert("No hay viaje activo");
      return;
    }

    const link = `https://bego.com.ht/track/${viajeActivo.viajeId || viajeActivo.id}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Mi viaje BeGO",
          text: "Seguime en tiempo real",
          url: link
        });
      } else {
        await navigator.clipboard.writeText(link);
        alert("📋 Link copiado:\n" + link);
      }
    } catch (err) {
      console.error("❌ Error compartir:", err);
    }
  }

  /* =========================
     SOS / EMERGENCIA
  ========================= */
  async function llamarEmergencia() {
    if (!viajeActivo) {
      alert("No hay viaje activo");
      return;
    }

    try {
      await fetch(`${getServerUrl()}/emergencia`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          viajeId: viajeActivo.id,
          tipo: "SOS_PASAJERO",
          timestamp: Date.now()
        })
      });
    } catch (err) {
      console.error("SOS error:", err);
    }

    alert("🚨 Emergencia enviada. BeGO está monitoreando tu viaje.");
  }

  /* =========================
     REPORTAR INCIDENTE
  ========================= */
  function reportarIncidente() {
    if (!viajeActivo) {
      alert("No hay viaje activo");
      return;
    }

    localStorage.setItem("reporteViaje", viajeActivo.id);
    location.hash = "#/reporte"; // SPA FIX
  }

  /* =========================
     CONTACTO DE CONFIANZA
  ========================= */
  function llamarContacto() {
    const contacto = safeJson(localStorage.getItem("contactoEmergencia"));

    if (!contacto) {
      alert("No tenés contacto de emergencia configurado");
      return;
    }

    window.location.href = `tel:${contacto.telefono}`;
  }

  /* =========================
     GEO (opcional)
  ========================= */
  function obtenerUbicacionActual() {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      pos => {
        console.log("📍 Ubicación:", pos.coords.latitude, pos.coords.longitude);
      },
      err => console.warn("GPS error:", err),
      { enableHighAccuracy: true }
    );
  }

  /* =========================
     EVENTS (SPA SAFE)
  ========================= */
  document.querySelectorAll("[data-action='compartir']").forEach(el => {
    el.onclick = compartirViaje;
  });

  document.querySelectorAll("[data-action='sos']").forEach(el => {
    el.onclick = llamarEmergencia;
  });

  document.querySelectorAll("[data-action='contacto']").forEach(el => {
    el.onclick = llamarContacto;
  });

  document.querySelectorAll("[data-action='reportar']").forEach(el => {
    el.onclick = reportarIncidente;
  });

  cargarViajeActivo();
}

function safeJson(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}
