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
    const viajeId = getViajeId(viajeActivo) || getViajeId(safeJson(localStorage.getItem("viajeActivo")));
    if (!viajeId) {
      alert("Aucune course active");
      return;
    }

    try {
      const token = getAccessToken();
      const response = await fetch(
        `${getServerUrl()}/api/pagos/viaje/${encodeURIComponent(viajeId)}/compartir`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token || ""}`,
            "Content-Type": "application/json",
          },
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.url) {
        throw new Error(data.error || "Impossible de generer le lien securise");
      }

      if (navigator.share) {
        await navigator.share({
          title: "Ma course BeGO",
          text: "Suivez ma course en direct",
          url: data.url,
        });
      } else {
        await navigator.clipboard.writeText(data.url);
        alert(`Lien securise copie:\n${data.url}`);
      }
    } catch (err) {
      if (err?.name === "AbortError") return;
      console.error("Erreur partage:", err);
      alert(err.message || "Impossible de partager la course");
    }
  }

  async function llamarEmergencia() {
    const viajeId = getViajeId(viajeActivo);
    if (!viajeId) {
      alert("Aucune course active");
      return;
    }

    if (!window.confirm("Envoyer maintenant une alerte SOS a BeGO ?")) {
      return;
    }

    const buttons = document.querySelectorAll("[data-action='sos']");
    buttons.forEach((button) => {
      button.disabled = true;
    });

    try {
      const ubicacion = await getCurrentLocation();
      const response = await fetch(`${getServerUrl()}/api/emergency`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          viajeId,
          tipo: "SOS_PASAJERO",
          ubicacion,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Alerte non recue");
      }

      alert(`Urgence recue par BeGO. Reference: ${data.alertId}`);
    } catch (err) {
      console.error("SOS error:", err);
      alert("L'alerte n'a pas ete envoyee. Appelez votre contact ou les services d'urgence.");
    } finally {
      buttons.forEach((button) => {
        button.disabled = false;
      });
    }
  }

  function reportarIncidente() {
    if (!viajeActivo) {
      alert("Aucune course active");
      return;
    }

    localStorage.setItem("reporteViaje", getViajeId(viajeActivo));
    location.hash = "#/soporte";
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

function getViajeId(viaje) {
  return String(viaje?.viajeId || viaje?.id || viaje?._id || "").trim();
}

function getAccessToken() {
  const raw = localStorage.getItem("token") || localStorage.getItem("BeGO_token") || "";
  const token = String(raw).trim();
  return token.startsWith("\"") && token.endsWith("\"")
    ? token.slice(1, -1)
    : token;
}

function getCurrentLocation() {
  if (!navigator.geolocation) return Promise.resolve(null);

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
      }),
      () => resolve(null),
      {
        enableHighAccuracy: true,
        maximumAge: 15_000,
        timeout: 8_000,
      }
    );
  });
}

function safeJson(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}
