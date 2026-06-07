import { BASE } from "./router.utils.js";
import { AppState } from "../state.js";
import { stopGeo } from "../../map/map.geo.js?v=20260606-recenter-map";

import { renderWallet } from "../../../wallet/wallet.view.js?v=20260605-wallet-secure";
import { initWallet } from "../../../wallet/wallet-init.js?v=20260605-wallet-secure";
import { renderCuenta } from "../../../paginas/cuenta.js";
import { renderConfiguracion } from "../../../paginas/configuracion.js?v=20260607-config-functional";
import { initConfiguracion } from "../../configuracion.js?v=20260607-config-functional";
import { renderSeguridad } from "../../../paginas/centro-seguridad.js?v=20260603-mobile-support";
import { initSeguridad } from "../../seguridad.js?v=20260603-mobile-support";
import { renderAyuda } from "../../../paginas/ayuda.js?v=20260603-mobile-support";
import { renderSoporte } from "../../../paginas/soporte.js?v=20260607-support-grid-fix";
import { renderServicios } from "../../../paginas/servicios.js";
import { initModo } from "../../modo.js";
import { initUserUI } from "../../user.js";
import { renderGanancias } from "../../../paginas/generar-ganancias.js?v=20260605-earnings-page";
import { initGanancias } from "../../ganancias.js?v=20260605-earnings-page";
import { initDetalleViaje } from "../../detalle-viaje.js?v=20260605-rating-premium";
import { renderDetalleViaje } from "../../../paginas/detalle-viaje.js?v=20260605-rating-premium";

import { renderReciboRecarga } from "../../../paginas/recibo-recarga.js";
import { initReciboRecarga } from "../../ReciboRecarga.js";

import { renderRecarga } from "../../../paginas/recarga.js";
import { initRecarga } from "../../recarga.js";
import { renderPromos } from "../../../paginas/promos.js?v=20260604-admin-offers";
import { initPromosPage } from "../../promos/passenger-offers.js?v=20260604-admin-offers";
import { renderPago } from "../../../paginas/pago.js?v=20260607-payments-mobile";
import { initPago } from "../../pagos.js?v=20260607-payments-mobile";
import { renderLegalConfianza } from "../../../paginas/legal-confianza.js?v=20260607-legal-mobile-grid";

// 🔥 Importa el render de actividad
import { initActividad } from "../../pages/actividad.js";
import { renderActividad } from "../../../paginas/actividad.js"; 

export const routes = {

  "/": {
    url: `${BASE}/index.html`,
    class: "home-page",
    init: () => {
      AppState.set("pasajeroInicializado", false);
      const mapEl = document.getElementById("map");
      if (mapEl) {
        mapEl.classList.remove("hidden");
        setTimeout(() => {
          window.map?.invalidateSize?.();
        }, 250);
      }
      return () => { stopGeo?.(); };
    }
  },

  // =========================
  // 🚀 MÓDULOS SPA PURE JS (ACTUALIZADO)
  // =========================
  "/actividad": { 
    render: renderActividad, // 🔥 Cambiado de 'url' a 'render'
    init: initActividad, 
    class: "actividad-page" 
  },

  "/recarga": {
    render: renderRecarga,
    init: initRecarga,
    class: "recarga-page"
  },
  
  "/wallet": { render: renderWallet, init: initWallet, class: "wallet-page" },
  "/cuenta": { render: renderCuenta, init: () => { initModo(); initUserUI(); }, class: "cuenta-page" },
  "/configuracion": { render: renderConfiguracion, init: initConfiguracion, class: "config-page" },
  "/seguridad": { render: renderSeguridad, init: initSeguridad, class: "seguridad-page" },
  "/ayuda": { render: renderAyuda, class: "ayuda-page" },
  "/soporte": { render: renderSoporte, class: "soporte-page" },
  "/servicios": { render: renderServicios, class: "servicios-page" },
  "/ganancias": { render: renderGanancias, init: initGanancias, class: "ganancias-page" },
  "/detalle-viaje": { render: renderDetalleViaje, init: initDetalleViaje, class: "detalle-page" },
  "/recibo-recarga": { render: renderReciboRecarga, init: initReciboRecarga, class: "recibo-recarga-page" },

  "/familia": { render: renderFamilia, init: initFamilia, class: "familia-container" },
  "/pago": { render: renderPago, init: initPago, class: "pagos" },
  "/seguimiento": { render: renderSeguimiento, class: "seguimiento-page" },
  "/promos": { render: renderPromos, init: initPromosPage, class: "promos-page" },
  "/legal-confianza": { render: renderLegalConfianza, class: "legal-page" },
  "/datos-motorista": { render: () => renderSimple("Datos del motorista", "Se mostraran cuando tengas un viaje asignado."), class: "simple-page" },
  "/verificar": { render: () => renderSimple("Verificar recibo", "Ingresa desde el recibo para validar su firma digital."), class: "simple-page" }
};

function renderSimple(titulo, texto) {
  return `
    <section class="page-section" style="padding:24px 18px;">
      <h1 style="font-size:22px;margin:0 0 8px;">${titulo}</h1>
      <p style="color:var(--muted);margin:0;">${texto}</p>
    </section>
  `;
}

function renderFamilia() {
  return `
    <section class="familia-lista" id="listaFamilia"></section>
    <button class="btn-agregar ripple" id="btnAgregar">
      <i class="fa-solid fa-plus"></i> Agregar familiar
    </button>
  `;
}

function initFamilia() {
  const lista = document.getElementById("listaFamilia");
  const btnAgregar = document.getElementById("btnAgregar");
  if (!lista || !btnAgregar) return;

  const getFamilia = () => JSON.parse(localStorage.getItem("familia") || "[]");
  const setFamilia = (familia) => localStorage.setItem("familia", JSON.stringify(familia));
  const iconoPorTipo = (tipo) => tipo === "nino" ? "fa-baby" : tipo === "mayor" ? "fa-person-cane" : "fa-user";

  const render = () => {
    const familia = getFamilia();
    lista.innerHTML = familia.length
      ? familia.map((f, i) => `
          <div class="familia-card">
            <div class="familia-header">
              <div class="familia-icon ${f.tipo}">
                <i class="fa-solid ${iconoPorTipo(f.tipo)}"></i>
              </div>
              <div>
                <h4>${f.nombre}</h4>
                <small>${f.tipo === "nino" ? "Nino" : f.tipo === "mayor" ? "Adulto mayor" : "Adulto"} - Limite: $${f.limite}</small>
              </div>
            </div>
            <button type="button" data-eliminar-familiar="${i}">Eliminar</button>
          </div>
        `).join("")
      : "<p>No hay familiares agregados.</p>";
  };

  btnAgregar.onclick = () => {
    const nombre = prompt("Nombre del familiar:");
    if (!nombre) return;

    const tipo = prompt("Tipo: nino / adulto / mayor", "adulto");
    const limite = prompt("Limite mensual:");
    if (!tipo || !limite) return;

    const familia = getFamilia();
    familia.push({ nombre, tipo, limite });
    setFamilia(familia);
    render();
  };

  lista.onclick = (event) => {
    const btn = event.target.closest("[data-eliminar-familiar]");
    if (!btn || !confirm("Eliminar familiar?")) return;

    const familia = getFamilia();
    familia.splice(Number(btn.dataset.eliminarFamiliar), 1);
    setFamilia(familia);
    render();
  };

  render();
}

function renderSeguimiento() {
  return `
    <section style="padding:24px 18px;">
      <h1 style="font-size:22px;margin:0 0 8px;">Seguimiento en vivo</h1>
      <p style="color:var(--muted);margin:0;">Cuando tengas un viaje activo, el mapa principal mostrara el motorista en tiempo real.</p>
    </section>
  `;
}
