import { getServerUrl } from "../conexion.js";
import { navigateTo } from "../core/router/router.js";

export function initActividad() {
  const API_URL = getServerUrl();
  const token = localStorage.getItem("token");

  const lista = document.querySelector(".actividad-lista");
  const viajeActivoBox = document.getElementById("viajeActivoBox");
  const infoViaje = document.getElementById("infoViaje");
  const botonesFiltro = document.querySelectorAll(".actividad-filtros button");
  const totalViajesEl = document.getElementById("actividadTotalViajes");
  const totalRecargasEl = document.getElementById("actividadTotalRecargas");

  if (!lista) return;

  function sincronizarInterfaz() {
    const user = safeJson(localStorage.getItem("usuario")) || safeJson(localStorage.getItem("BeGO_user")) || {};
    const nombreHeader = document.querySelector(".user-info strong");
    if (nombreHeader && user.nombre) {
      nombreHeader.textContent = `${user.nombre} ${user.apellido || ""}`.trim();
    }
  }

  async function cargarViajeActivo() {
    if (!viajeActivoBox || !infoViaje || !token) return;

    try {
      const res = await fetch(`${API_URL}/api/viajes/activo`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "true"
        }
      });

      if (!res.ok) {
        viajeActivoBox.style.display = "none";
        return;
      }

      const viaje = await res.json();

      if (!viaje) {
        viajeActivoBox.style.display = "none";
        return;
      }

      viajeActivoBox.style.display = "flex";

      const motorista = viaje.motorista || {};
      const vehiculo = motorista.vehiculo || {};
      const nombre = motorista.nombre || "Conductor";
      const moto = vehiculo.marca || vehiculo.modelo || "Moto";
      const placa = vehiculo.placa || "S/P";

      infoViaje.textContent = `${nombre} - ${moto} - ${placa}`;
      viajeActivoBox.onclick = () => navigateTo("/");
    } catch (err) {
      console.error("Error viaje activo:", err);
      viajeActivoBox.style.display = "none";
    }
  }

  async function cargarActividad(filtro = "todos") {
    if (!token) {
      lista.innerHTML = "<p class='empty'>Inicia sesion para ver tu actividad.</p>";
      return;
    }

    lista.innerHTML = '<div class="loader-mini"></div>';

    try {
      const [resViajes, resRecargas] = await Promise.all([
        fetch(`${API_URL}/api/viajes/mis-viajes`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "ngrok-skip-browser-warning": "true"
          }
        }),
        fetch(`${API_URL}/api/recargas`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "ngrok-skip-browser-warning": "true"
          }
        })
      ]);

      let viajes = resViajes.ok ? await resViajes.json() : [];
      let recargas = resRecargas.ok ? await resRecargas.json() : [];

      viajes = Array.isArray(viajes) ? viajes : [];
      recargas = Array.isArray(recargas) ? recargas : [];

      if (totalViajesEl) totalViajesEl.textContent = String(viajes.length);
      if (totalRecargasEl) totalRecargasEl.textContent = String(recargas.length);

      const actividadViajes = viajes.map((v) => ({
        tipo: v.tipo || "viaje",
        estado: v.estado,
        fecha: v.finViajeAt || v.createdAt || new Date().toISOString(),
        data: v
      }));

      const actividadRecargas = recargas.map((r) => ({
        tipo: "recarga",
        estado: r.estado || "completada",
        fecha: r.fecha || r.createdAt || new Date().toISOString(),
        data: r
      }));

      let actividad = [...actividadViajes, ...actividadRecargas];

      if (filtro !== "todos") {
        actividad = actividad.filter((item) => item.tipo === filtro);
      }

      actividad.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      lista.innerHTML = "";

      if (!actividad.length) {
        lista.innerHTML = "<p class='empty'>No hay actividad para este filtro.</p>";
        return;
      }

      actividad.forEach((item) => {
        if (item.tipo === "viaje" || item.tipo === "envio") {
          lista.appendChild(renderViajeItem(item));
          return;
        }

        if (item.tipo === "recarga") {
          lista.appendChild(renderRecargaItem(item));
        }
      });
    } catch (err) {
      console.error(err);
      lista.innerHTML = `<p class='empty'>Error: ${err.message}</p>`;
    }
  }

  function renderViajeItem(item) {
    const viaje = item.data;
    const cancelado = viaje.estado === "cancelado";
    const tipo = viaje.tipo === "envio" ? "envio" : "viaje";
    const titulo = cancelado
      ? "Viaje cancelado"
      : tipo === "envio" ? "Envio completado" : "Viaje completado";
    const ratingScore = ratingViaje(viaje.rating);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `actividad-btn ripple ${cancelado ? "cancelado" : ""}`;
    btn.innerHTML = `
      <div class="actividad-card ${cancelado ? "cancelado" : ""}">
        <div class="actividad-izq">
          <div class="actividad-icon ${cancelado ? "cancelado" : tipo}">
            <i class="fa-solid ${cancelado ? "fa-xmark" : tipo === "envio" ? "fa-box" : "fa-motorcycle"}"></i>
          </div>
          <div class="actividad-info">
            <span>${titulo}</span>
            <p>${shortAddress(viaje.origen?.direccion, "Origen")} -> ${shortAddress(viaje.destino?.direccion, "Destino")}</p>
            <small>${formatDate(item.fecha)}</small>
          </div>
        </div>
        <div class="actividad-der">
          <span class="precio">HTG ${money(viaje.precio)}</span>
          ${ratingScore ? `<small class="actividad-rating"><i class="fa-solid fa-star"></i> ${ratingScore.toFixed(0)}/5</small>` : ""}
        </div>
      </div>
    `;

    btn.onclick = () => {
      localStorage.setItem("detalleViaje", JSON.stringify(viaje));
      navigateTo("/detalle-viaje");
    };

    return btn;
  }

  function renderRecargaItem(item) {
    const recarga = item.data;
    const div = document.createElement("div");
    div.className = "actividad-card";
    div.innerHTML = `
      <div class="actividad-izq">
        <div class="actividad-icon recarga">
          <i class="fa-solid fa-mobile-screen"></i>
        </div>
        <div class="actividad-info">
          <span>Recarga celular</span>
          <p>${recarga.numero || "--"} - ${recarga.operadora || "Operadora"}</p>
          <small>${formatDate(item.fecha)}</small>
        </div>
      </div>
      <div class="actividad-der">
        <span class="precio">HTG ${money(recarga.monto)}</span>
      </div>
    `;
    return div;
  }

  botonesFiltro.forEach((btn) => {
    btn.onclick = () => {
      botonesFiltro.forEach((item) => item.classList.remove("activo"));
      btn.classList.add("activo");
      cargarActividad(btn.dataset.filtro);
    };
  });

  sincronizarInterfaz();
  cargarViajeActivo();
  cargarActividad();
}

function safeJson(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function shortAddress(value, fallback) {
  return (value || fallback).split(",")[0].trim();
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "--" : date.toLocaleString();
}

function money(value) {
  const number = Number(value || 0);
  return number.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function ratingViaje(value) {
  if (typeof value === "number") return value;
  const score = Number(value?.score || value?.rating || 0);
  return Number.isFinite(score) && score > 0 ? Math.max(1, Math.min(5, score)) : 0;
}
