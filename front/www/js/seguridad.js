import { getServerUrl } from "./conexion.js";

export function initSeguridad() {
  const boxViaje = document.getElementById("viajeActivoBox");
  const infoViaje = document.getElementById("infoViaje");
  const viajeActivo = safeJson(localStorage.getItem("viajeActivo"));

  function cargarViajeActivo() {
    if (!viajeActivo || viajeActivo.estado !== "en_curso") {
      if (boxViaje) boxViaje.style.display = "none";
      return;
    }

    if (boxViaje && infoViaje) {
      boxViaje.style.display = "grid";
      const motorista = viajeActivo.motorista || {};
      const nombre = motorista.nombre || "Conducteur";
      const moto = motorista.moto || motorista.vehiculo?.modelo || "Moto";
      const placa = motorista.placa || motorista.vehiculo?.placa || "--";
      infoViaje.textContent = `${nombre} - ${moto} - ${placa}`;
    }
  }

  async function compartirViaje() {
    if (!viajeActivo) {
      alert("Aucune course active");
      return;
    }

    const link = `https://bego.com.ht/track/${viajeActivo.viajeId || viajeActivo.id}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Ma course BeGO",
          text: "Suivez ma course en direct",
          url: link,
        });
      } else {
        await navigator.clipboard.writeText(link);
        alert(`Lien copie:\n${link}`);
      }
    } catch (err) {
      console.error("Erreur partage:", err);
    }
  }

  async function llamarEmergencia() {
    if (!viajeActivo) {
      alert("Aucune course active");
      return;
    }

    try {
      await fetch(`${getServerUrl()}/emergencia`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          viajeId: viajeActivo.id,
          tipo: "SOS_PASAJERO",
          timestamp: Date.now(),
        }),
      });
    } catch (err) {
      console.error("SOS error:", err);
    }

    alert("Urgence envoyee. BeGO surveille votre course.");
  }

  function reportarIncidente() {
    if (!viajeActivo) {
      alert("Aucune course active");
      return;
    }

    localStorage.setItem("reporteViaje", viajeActivo.id);
    location.hash = "#/reporte";
  }

  function llamarContacto() {
    const contacto = safeJson(localStorage.getItem("contactoEmergencia"));

    if (!contacto) {
      alert("Aucun contact d'urgence configure");
      return;
    }

    window.location.href = `tel:${contacto.telefono}`;
  }

  document.querySelectorAll("[data-action='compartir']").forEach((el) => {
    el.onclick = compartirViaje;
  });

  document.querySelectorAll("[data-action='sos']").forEach((el) => {
    el.onclick = llamarEmergencia;
  });

  document.querySelectorAll("[data-action='contacto']").forEach((el) => {
    el.onclick = llamarContacto;
  });

  document.querySelectorAll("[data-action='reportar']").forEach((el) => {
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
