// oferta.render.js

import { 
  UI, 
  initUI,
  mostrarPanel, 
  iniciarSonidoOfertaLoop,
  detenerSonidoOferta,
  ocultarPanel, 
  resetBotonAceptar,
  actualizarCirculoProgreso
} from "./oferta.ui.js?v=20260608-offer-net-cash";

import { setViajeActual, ofertaState, getViajeId, getOfertaExpiraEn } from "./oferta.state.js";
import { initMiniMapa, renderMiniRuta } from "./oferta.miniMap.js?v=20260614-mobile-runtime";
import { siguienteDeCola } from "./oferta.queue.js";
import { isDriverOnline } from "../driver.status.js?v=20260627-map-icons";
import { formatGourdes, getPaymentLabel, getTripMoney } from "./oferta.money.js?v=20260608-offer-net-cash";

/*************************************************
 * 🧹 LIMPIAR OFERTA
 *************************************************/
export function limpiarOferta({ resetViaje = true } = {}) {
  try {
    if (ofertaState.intervalo) {
      clearInterval(ofertaState.intervalo);
      ofertaState.intervalo = null;
    }

    if (ofertaState.failSafeTimer) {
      clearTimeout(ofertaState.failSafeTimer);
      ofertaState.failSafeTimer = null;
    }

    ofertaState.aceptando = false;
    ofertaState.viajeMostradoId = null;

    detenerSonidoOferta();

    if (resetViaje) {
      setViajeActual(null);
    }

    ocultarPanel();
    resetBotonAceptar();

    actualizarCirculoProgreso(15, 15);

    // 🔁 Procesar siguiente en cola
    const siguiente = siguienteDeCola();
    if (siguiente) {
      setTimeout(() => renderOferta(siguiente), 250);
    }

  } catch (err) {
    console.error("❌ Error en limpiarOferta:", err);
  }
}

/*************************************************
 * 🎯 RENDER OFERTA
 *************************************************/
export async function renderOferta(viaje, opts = {}) {
  try {
    if (!UI.panel) {
      initUI();
    }

    if (!isDriverOnline()) {
      ocultarPanel();
      return;
    }

    if (!viaje) return;
    if (!UI.panel) {
      console.warn("Panel de oferta no disponible en el DOM.");
      return;
    }

    const vId = getViajeId(viaje);
    if (!vId) return;

    const expiraEn = getOfertaExpiraEn(viaje);
    const tiempoTotalMs = Math.max(1, Number(viaje.ttl) || expiraEn - Date.now());
    if (expiraEn <= Date.now()) return;

    const actualId = ofertaState.viajeMostradoId;

    /*************************************************
     * 🧠 DEDUP + CONTROL DE REEMPLAZO
     *************************************************/
    // 👉 misma oferta (duplicado)
    if (actualId && actualId === vId) {
      console.log("⚠️ Oferta duplicada, ignorando:", vId);
      return;
    }

    // 👉 hay otra oferta visible → decidir comportamiento
    if (actualId && actualId !== vId) {
      // Si está aceptando, NO interrumpir
      if (ofertaState.aceptando) {
        console.log("⏳ En proceso de aceptación, enviando a cola:", vId);
        return;
      }

      console.log("🔄 Nueva oferta reemplaza la actual:", vId);
      limpiarOferta({ resetViaje: false });
    }

    // 🔒 Registrar nueva oferta visible
    ofertaState.viajeMostradoId = vId;
    setViajeActual(viaje);

    /*************************************************
     * 🧾 UI TEXTO
     *************************************************/
    const money = getTripMoney(viaje);

    if (UI.precioLabel) {
      UI.precioLabel.textContent = viaje.tipo === "envio" ? "Gain net livraison" : "Gain net course";
    }

    if (UI.precio) {
      UI.precio.textContent = formatGourdes(money.netoMotorista);
    }

    if (UI.netoHint) {
      UI.netoHint.textContent = "Montant net pour vous";
    }

    if (UI.metodo) {
      const metodo = getPaymentLabel(money.metodoPago);
      UI.metodo.textContent = viaje.tipo === "envio" ? `Livraison - ${metodo}` : metodo;
    }

    if (UI.origenNombre) {
      UI.origenNombre.textContent = viaje.origen?.direccion || "Buscando origen...";
    }

    if (UI.destinoNombre) {
      UI.destinoNombre.textContent = viaje.destino?.direccion || "Buscando destino...";
    }

    renderPaqueteOferta(viaje);
    renderIdaVueltaOferta(viaje);

    /*************************************************
     * 🎨 MOSTRAR UI
     *************************************************/
    mostrarPanel();
    iniciarSonidoOfertaLoop();

    /*************************************************
     * 🌍 GEOCODING (NO BLOQUEANTE)
     *************************************************/
    if (!viaje.origen?.direccion && viaje.origen?.lat) {
      obtenerDireccion(viaje.origen.lat, viaje.origen.lng)
        .then(d => {
          if (UI.origenNombre && d) UI.origenNombre.textContent = d;
        })
        .catch(() => {});
    }

    if (!viaje.destino?.direccion && viaje.destino?.lat) {
      obtenerDireccion(viaje.destino.lat, viaje.destino.lng)
        .then(d => {
          if (UI.destinoNombre && d) UI.destinoNombre.textContent = d;
        })
        .catch(() => {});
    }

    /*************************************************
     * 🗺️ MINI MAPA
     *************************************************/
    setTimeout(() => {
      try {
        initMiniMapa();
        if (viaje.origen && viaje.destino) {
          renderMiniRuta(viaje.origen, viaje.destino);
        }
      } catch (err) {
        console.warn("⚠️ Error mini mapa:", err);
      }
    }, 50);

    /*************************************************
     * ⏱️ TIMER
     *************************************************/

    ofertaState.intervalo = setInterval(() => {
      try {
        const restanteMs = Math.max(0, expiraEn - Date.now());
        const restante = Math.ceil(restanteMs / 1000);
        
        if (UI.contador) {
          UI.contador.textContent = restante;
        }
        
        actualizarCirculoProgreso(restanteMs, tiempoTotalMs);
        
        if (restanteMs <= 0) {
          console.log("⏳ Oferta expirada (local):", vId);
          limpiarOferta();
        }
        
      } catch (err) {
        console.error("❌ Error en timer oferta:", err);
      }
    }, 250);
      
    } catch (error) {
      console.error("❌ Error en renderOferta:", error);
    }
}

function renderPaqueteOferta(viaje) {
  const body = document.querySelector(".oferta-body");
  if (!body) return;

  const existente = document.getElementById("ofertaPaqueteInfo");
  if (viaje.tipo !== "envio" || !viaje.paquete) {
    existente?.remove();
    return;
  }

  const html = `
    <small>ENVIO DE PAQUETE</small>
    <strong>${Number(viaje.paquete.pesoKg || 0).toFixed(1)} kg</strong>
    <span>${escapeHtml(viaje.paquete.descripcion || "Paquete")}</span>
    ${viaje.paquete.instrucciones ? `<em>${escapeHtml(viaje.paquete.instrucciones)}</em>` : ""}
  `;

  if (existente) {
    existente.innerHTML = html;
    return;
  }

  const card = document.createElement("div");
  card.id = "ofertaPaqueteInfo";
  card.className = "oferta-paquete-info";
  card.innerHTML = html;
  body.insertBefore(card, body.querySelector(".rutas-box"));
}

function renderIdaVueltaOferta(viaje) {
  const body = document.querySelector(".oferta-body");
  if (!body) return;

  const existente = document.getElementById("ofertaIdaVueltaInfo");
  if (viaje.idaVuelta?.solicitada !== true) {
    existente?.remove();
    return;
  }

  const html = `
    <small>IDA Y VUELTA</small>
    <strong>${formatGourdes(viaje.idaVuelta.precioTotal || viaje.precio || 0)}</strong>
    <span>Al llegar, el pasajero puede hacer la vuelta o anularla y pagar solo la ida.</span>
  `;

  if (existente) {
    existente.innerHTML = html;
    return;
  }

  const card = document.createElement("div");
  card.id = "ofertaIdaVueltaInfo";
  card.className = "oferta-paquete-info";
  card.innerHTML = html;
  body.insertBefore(card, body.querySelector(".rutas-box"));
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
