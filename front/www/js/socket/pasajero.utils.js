// pasajero/ui.js
import { viajeState } from "../viaje/viaje.state.js";
import { actualizarBotonViaje } from "../pasajero/ui/boton/botonViaje.ui.js?v=20260623-roundtrip-v2";
import { cerrarBuscandoMotorista } from "../pasajero/pasajero.ui.js";
import { limpiarViajePasajero } from "../socket/viaje.limpieza.js";
import { limpiarRutas } from "../map/map.ruta.js?v=20260628-dark-route-locked";
import { initDriverMinimize } from "../ui/driver.minimize.js";
import { resetRutaController } from "../map/map.route.flow.js?v=20260628-dark-route-locked";
import { actualizarETA, resetETA } from "../pasajero/pasajero.eta.js";
import { queuePendingRating, submitViajeRating } from "../rating/rating.api.js?v=20260605-rating-premium";
import {
  confirmarFinalizacionPendiente,
  guardarFinalizacionPendiente,
  getViajeIdFromPayload
} from "../viaje/viaje.finalizado.local.js?v=20260615-smooth-autofinish";

/**
 * Guarda la sesión del viaje actual en localStorage de forma segura
 * @param {string} estadoStr 
 */
export function guardarSesionViaje(estadoStr) {
  if (!estadoStr) return;

  try {
    const dataASalvar = {
      estado: estadoStr,
      viajeId: viajeState.viajeId,
      cotizando: viajeState.cotizando,
      quoteId: viajeState.quoteId,
      precio: viajeState.precio,
      precioBase: viajeState.precioBase,
      descuentoWallet: viajeState.descuentoWallet,
      descuentoWalletRate: viajeState.descuentoWalletRate,
      walletDiscount: viajeState.walletDiscount,
      distanciaKm: viajeState.distanciaKm,
      duracionMin: viajeState.duracionMin,
      metodoPago: viajeState.metodoPago,
      estadoPago: viajeState.estadoPago,
      tipoServicio: viajeState.tipoServicio || "viaje",
      paquete: viajeState.paquete || null,
      idaVuelta: viajeState.idaVuelta || null,
      precioConfirmado: viajeState.precioConfirmado,
      origen: viajeState.origen,
      destino: viajeState.destino,
      motorista: viajeState.motorista,
      proximoDestino: viajeState.proximoDestino || null,
      timestamp: Date.now()
    };
    localStorage.setItem("viajeActivo", JSON.stringify(dataASalvar));
  } catch (err) {
    console.error("❌ Error guardando sesion de viaje en producción:", err);
  }
}

/**
 * Limpia todo el estado en memoria y almacenamiento persistente del viaje activo
 */
export function limpiarSesionViaje() {
  Object.assign(viajeState, {
    activo: false, cotizando: false, buscando: false, asignado: false, llego: false, enCurso: false,
    viajeId: null, quoteId: null, motorista: null, precioConfirmado: false,
    precio: null, precioBase: null, descuentoWallet: 0, descuentoWalletRate: 0, walletDiscount: null,
    distanciaKm: null, duracionMin: null,
    metodoPago: null, estadoPago: null,
    tipoServicio: "viaje", paquete: null,
    idaVuelta: null,
    metodoPagosaldoBloqueado: false, destino: null, estado: null,
    finalizado: false, cancelado: false, expirado: false,
    proximoDestino: null
  });

  resetETA();
  document.getElementById("deliveryCodeCard")?.remove();
  localStorage.removeItem("viajeActivo");
  sessionStorage.removeItem("viajeActivo");
}

/**
 * Orquesta la desvinculación completa de componentes del mapa, sockets y vistas del flujo actual
 * @param {boolean} esCancelacionFuerte Determina si remueve forzosamente modales flotantes del DOM
 */
export function manejarCancelacionOLimpieza(esCancelacionFuerte = false) {
  cerrarBuscandoMotorista();
  limpiarViajePasajero();
  limpiarRutas();
  
  if (typeof resetRutaController === "function") resetRutaController();
  if (typeof window.eliminarMarcadorMotorista === "function") window.eliminarMarcadorMotorista();

  limpiarSesionViaje();
  actualizarBotonViaje();

  if (esCancelacionFuerte) {
    document.querySelectorAll("#buscandoMotorista, #modalPrecio, #modalFinalizado").forEach(el => el?.remove());
  }
}

/**
 * Renderiza la información del conductor y vehículo asignado controlando inconsistencias del Backend
 * @param {Object} motoristaInfo Datos desestructurados del conductor desde Redis/DB
 * @param {string} estado Fase actual del viaje ('asignado', 'en_curso', 'reservado')
 */
export function actualizarUIDriver(motoristaInfo, estado, viajeInfo = {}) {
  if (!motoristaInfo) return;

  if (typeof initDriverMinimize === "function") {
    initDriverMinimize();
  }

  // Controladores visuales principales de la vista de conductor asignado
  document.getElementById("menuDriver")?.classList.remove("oculto");
  document.getElementById("driverLista")?.classList.add("oculto");
  document.getElementById("driverAsignado")?.classList.remove("oculto");

  const setText = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  const viaje = {
    precio: viajeState.precio,
    distanciaKm: viajeState.distanciaKm,
    duracionMin: viajeState.duracionMin,
    metodoPago: viajeState.metodoPago,
    estadoPago: viajeState.estadoPago,
    origen: viajeState.origen,
    destino: viajeState.destino,
    viajeId: viajeState.viajeId,
    tipoServicio: viajeState.tipoServicio || "viaje",
    paquete: viajeState.paquete || null,
    idaVuelta: viajeState.idaVuelta || null,
    ...viajeInfo
  };

  const truncar = (value, max = 42) => {
    const text = String(value || "").trim();
    if (!text) return "Pendiente";
    return text.length > max ? `${text.slice(0, max - 1)}...` : text;
  };

  const formatMoney = (value) => {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount <= 0) return "--";
    return `${Math.round(amount).toLocaleString("es-PY")} G`;
  };

  const formatKm = (value) => {
    const km = Number(value);
    if (!Number.isFinite(km) || km <= 0) return "--";
    return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
  };

  const formatEta = () => {
    const eta = Number(viaje.eta ?? viaje.duracionMin);
    if (!Number.isFinite(eta) || eta <= 0) return "Calculando";
    return eta <= 1 ? "Llegando" : `${Math.ceil(eta)} min`;
  };

  const formatPago = () => {
    const metodo = {
      efectivo: "Efectivo",
      wallet: "Wallet",
      moncash: "MonCash",
      natcash: "NatCash"
    }[viaje.metodoPago] || "Pago";

    const estadoPago = {
      pendiente: "pendiente",
      esperando_pago: "esperando",
      en_escrow: "en escrow",
      saldoBloqueado: "bloqueado",
      pagado: "pagado",
      penalizado: "penalizado",
      reembolsado: "reembolsado",
      fallido: "fallido"
    }[viaje.estadoPago];

    return estadoPago ? `${metodo} - ${estadoPago}` : metodo;
  };

  const nombreCompleto = `${motoristaInfo.nombre || ""} ${motoristaInfo.apellido || ""}`.trim() || "Conductor";
  setText("driverNombre", nombreCompleto);
  setText("driverTelefono", motoristaInfo.telefono || "—");
  setText("driverRating", motoristaInfo.calificacion || "5.0");
  const esEnvio = viaje.tipo === "envio" || viaje.tipoServicio === "envio";
  setText("driverTripId", viaje.viajeId ? `${esEnvio ? "Envio" : "Viaje"} ${String(viaje.viajeId).slice(-6).toUpperCase()}` : `${esEnvio ? "Envio" : "Viaje"} activo`);
  setText("driverPrecio", formatMoney(viaje.precio));
  setText("driverPago", formatPago());
  setText("driverDistancia", formatKm(viaje.distanciaKm));
  setText("driverEtaText", formatEta());
  setText("driverOrigen", truncar(viaje.origen?.direccion || viaje.origen?.address || "Origen confirmado", 54));
  setText("driverDestino", truncar(viaje.destino?.direccion || viaje.destino?.address || "Destino confirmado", 54));
  renderCodigoEntrega(viaje);

  // Sanitización de la estructura del nodo vehiculo ante fallas en cascada del backend
  const vehiculo = (motoristaInfo.vehiculo && typeof motoristaInfo.vehiculo === "object") 
    ? motoristaInfo.vehiculo 
    : {};

  const placa = vehiculo.placa || motoristaInfo.placa || "S/P";
  const marcaModelo = `${vehiculo.marca || ""} ${vehiculo.modelo || ""}`.trim();
  const color = vehiculo.color ? ` (${vehiculo.color})` : "";

  // Formato optimizado para producción: "Toyota Hilux (Negro) - Placa: ABC-123" o fallback a Patente básica
  const textoVehiculoFinal = marcaModelo 
    ? `${marcaModelo}${color} — Placa: ${placa}` 
    : placa;

  setText("driverPlaca", textoVehiculoFinal);
  setText("driverVehicleColor", vehiculo.color ? `Color ${vehiculo.color}` : "Vehiculo verificado");

  const phone = String(motoristaInfo.telefono || "").replace(/[^\d+]/g, "");
  const btnLlamar = document.getElementById("btnLlamarDriver");
  const btnWhats = document.getElementById("btnWhatsDriver");

  if (btnLlamar) {
    btnLlamar.disabled = !phone;
    btnLlamar.onclick = phone ? () => { window.location.href = `tel:${phone}`; } : null;
  }

  if (btnWhats) {
    btnWhats.disabled = !phone;
    btnWhats.onclick = phone ? () => { window.location.href = `https://wa.me/${phone.replace("+", "")}`; } : null;
  }

  const img = document.getElementById("driverFoto");
  if (img && motoristaInfo.foto) {
    img.src = motoristaInfo.foto;
  }

  const estadoBox = document.getElementById("estadoViaje");
  if (estadoBox) {
    if (estado === "en_curso") {
      estadoBox.innerHTML = `<span style="color:#22c55e;">🏁 En viaje hacia el destino</span>`;
    } else {
      estadoBox.innerHTML = estado === "reservado"
        ? `<span style="color:#facc15;">⌛ El conductor está terminando un viaje...</span>`
        : `<span style="color:#00e5ff;">🛵 Conductor en camino</span>`;
    }
  }

  if (typeof window.updateDriverBubble === "function") {
    window.updateDriverBubble({
      foto: motoristaInfo.foto,
      nombre: nombreCompleto,
      eta: estado === "en_curso" ? "En viaje" : "En camino"
    });
  }

  if (typeof window.syncDriverPanelVisibility === "function") {
    window.syncDriverPanelVisibility({
      viajeId: viaje.viajeId || viajeInfo.viajeId || viajeInfo._id || "",
      forceOpen: viajeInfo.forceOpenDriverPanel === true
    });
  }
}

/**
 * Inyecta y controla el ciclo de vida del modal de finalización y feedback del viaje
 * @param {number|string} total Monto total calculado del servicio
 */
function mostrarModalFinalizadoLegacy(total) {
  // Asegurar remoción de instancias previas para evitar duplicados en el DOM
  document.getElementById("modalFinalizado")?.remove();

  const motorista = viajeState.motorista || {};
  const modal = document.createElement("div");
  modal.id = "modalFinalizado";

  const formatearUbicacion = (ubicacion) => {
    if (ubicacion?.direccion) return ubicacion.direccion;
    if (ubicacion?.lat && ubicacion?.lng) return `${ubicacion.lat.toFixed(5)}, ${ubicacion.lng.toFixed(5)}`;
    return "—";
  };

  modal.innerHTML = `
  <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.65); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 9999; animation: fadeIn 0.3s ease;">
    <div style="background: #0f172a; border-radius: 22px; padding: 25px; width: 92%; max-width: 370px; color: white; box-shadow: 0 20px 60px rgba(0,0,0,0.5); animation: scaleIn 0.3s ease; font-family: system-ui;">

      <div style="text-align:center;">
        <div style="font-size:42px;">🏁</div>
        <h2 style="margin:5px 0; font-size: 22px; font-weight: 700;">Viaje finalizado</h2>
        <p style="color:#94a3b8; font-size:14px;">Gracias por viajar con BeGO</p>
      </div>

      <div style="background:#020617; border-radius:12px; padding:15px; margin-top:15px; font-size:13px; line-height: 1.4;">
        <div style="display:flex; justify-content:space-between; gap: 10px;">
          <span style="color: #64748b; min-width: 50px;">Origen</span> 
          <span style="text-align: right; word-break: break-word;">${formatearUbicacion(viajeState.origen)}</span>
        </div>
        <div style="display:flex; justify-content:space-between; margin-top: 6px; gap: 10px;">
          <span style="color: #64748b; min-width: 50px;">Destino</span> 
          <span style="text-align: right; word-break: break-word;">${formatearUbicacion(viajeState.destino)}</span>
        </div>
        <div style="display:flex; justify-content:space-between; margin-top: 6px;">
          <span style="color: #64748b;">Conductor</span> 
          <span>${motorista.nombre || "—"}</span>
        </div>
        <hr style="border:0; border-top:1px dashed #334155; margin:10px 0;">
        <div style="display:flex; justify-content:space-between; font-size:18px; font-weight:bold; color:#22c55e;">
          <span>Total</span> <span>${total} G</span>
        </div>
      </div>

      <div style="margin-top:18px; text-align:center;">
        <p style="margin-bottom:8px; font-size: 14px; color: #e2e8f0;">Califica tu viaje</p>
        <div id="ratingStars" style="font-size:28px; cursor:pointer; user-select: none; letter-spacing: 2px;">⭐⭐⭐⭐⭐</div>
      </div>

      <textarea id="feedbackViaje" placeholder="Dejar comentario (opcional)" style="width:100%; margin-top:12px; padding:12px; border-radius:10px; border:1px solid #334155; background: #1e293b; color: white; outline:none; resize:none; font-size:13px; box-sizing: border-box; font-family: inherit; min-height: 60px;"></textarea>

      <button id="cerrarModalViaje" style="margin-top:15px; background:#22c55e; border:none; padding:14px; width:100%; border-radius:12px; font-weight:bold; color:white; cursor:pointer; font-size:15px; transition: background 0.2s;">
        Finalizar
      </button>

    </div>
  </div>
  <style>
    @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
    @keyframes scaleIn { from { transform: scale(0.92); opacity: 0 } to { transform: scale(1); opacity: 1 } }
    #cerrarModalViaje:active { background: #16a34a !important; }
  </style>
  `;

  document.body.appendChild(modal);

  let rating = 5;
  const starsEl = modal.querySelector("#ratingStars");

  if (starsEl) {
    starsEl.addEventListener("click", (e) => {
      const rect = starsEl.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const index = Math.ceil((x / rect.width) * 5);
      rating = Math.max(1, Math.min(5, index)); // Garantizar rango estricto 1-5
      starsEl.innerHTML = "⭐".repeat(rating) + "☆".repeat(5 - rating);
    });
  }

  modal.querySelector("#cerrarModalViaje")?.addEventListener("click", () => {
    try {
      const feedback = modal.querySelector("#feedbackViaje")?.value?.trim() || "";
      const viajes = JSON.parse(localStorage.getItem("viajes") || "[]");

      viajes.unshift({
        estado: "completado",
        origen: viajeState.origen,
        destino: viajeState.destino,
        fecha: new Date().toLocaleString(),
        motorista: {
          id: motorista.id,
          nombre: motorista.nombre,
          apellido: motorista.apellido,
          foto: motorista.foto
        },
        precio: total,
        rating,
        feedback
      });

      // Guardamos la persistencia local de históricos acotando a los últimos 50 viajes por optimización de memoria
      if (viajes.length > 50) viajes.pop();

      localStorage.setItem("viajes", JSON.stringify(viajes));
    } catch (err) {
      console.error("❌ Error persistiendo histórico de viajes:", err);
    } finally {
      // Garantizamos que el limpiador general corra y destruya el modal independientemente de fallas en el localStorage
      manejarCancelacionOLimpieza(true);
      modal.remove();
    }
  });
}

export function mostrarModalFinalizado(total, payload = {}) {
  const viajeId = getViajeIdFromPayload(payload) || String(viajeState.viajeId || "").trim();
  const snapshot = {
    ...payload,
    viajeId,
    estado: "finalizado",
    total: total ?? payload.total ?? payload.precio ?? viajeState.precio ?? 0,
    precio: total ?? payload.precio ?? viajeState.precio ?? 0,
    origen: payload.origen || payload.viaje?.origen || viajeState.origen || null,
    destino: payload.destino || payload.viaje?.destino || viajeState.destino || null,
    motorista: payload.motorista || payload.viaje?.motorista || viajeState.motorista || null,
    tipoServicio: payload.tipoServicio || payload.tipo || payload.viaje?.tipo || viajeState.tipoServicio || "viaje",
    paquete: payload.paquete || payload.viaje?.paquete || viajeState.paquete || null,
    metodoPago: payload.metodoPago || viajeState.metodoPago || null,
    estadoPago: payload.estadoPago || viajeState.estadoPago || "pagado"
  };

  if (viajeId) {
    guardarFinalizacionPendiente(snapshot);
  }

  manejarCancelacionOLimpieza(false);
  document.getElementById("modalFinalizado")?.remove();

  const motorista = snapshot.motorista || {};
  const modal = document.createElement("div");
  modal.id = "modalFinalizado";

  const esEnvio = snapshot.tipoServicio === "envio" || snapshot.tipo === "envio";
  const titulo = esEnvio ? "Entrega completada" : "Viaje completado";
  const subtitulo = esEnvio
    ? "Tu paquete fue entregado correctamente."
    : "Gracias por viajar con BeGO.";
  const totalFinal = snapshot.total ?? total ?? 0;
  const totalTexto = Number.isFinite(Number(totalFinal))
    ? `${Math.round(Number(totalFinal)).toLocaleString("es-PY")} G`
    : `${totalFinal || 0} G`;

  const formatearUbicacion = (ubicacion) => {
    if (ubicacion?.direccion) return ubicacion.direccion;
    if (ubicacion?.lat && ubicacion?.lng) return `${ubicacion.lat.toFixed(5)}, ${ubicacion.lng.toFixed(5)}`;
    return "--";
  };

  const escapeHtml = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  const origen = escapeHtml(formatearUbicacion(snapshot.origen));
  const destino = escapeHtml(formatearUbicacion(snapshot.destino));
  const conductor = escapeHtml(
    `${motorista.nombre || ""} ${motorista.apellido || ""}`.trim() || "Motorista BeGO"
  );

  modal.innerHTML = `
  <div class="finalizado-overlay">
    <div class="finalizado-card" role="dialog" aria-modal="true" aria-labelledby="finalizadoTitulo">
      <div class="finalizado-hero">
        <div class="finalizado-check"><i class="fa-solid fa-check"></i></div>
        <small>${esEnvio ? "Envio BeGO" : "BeGO Ride"}</small>
        <h2 id="finalizadoTitulo">${titulo}</h2>
        <p>${subtitulo}</p>
      </div>

      <div class="finalizado-total">
        <span>Total pagado</span>
        <strong>${totalTexto}</strong>
      </div>

      <div class="finalizado-resumen">
        <div>
          <span>Origen</span>
          <strong>${origen}</strong>
        </div>
        <div>
          <span>Destino</span>
          <strong>${destino}</strong>
        </div>
        <div>
          <span>${esEnvio ? "Entregado por" : "Conductor"}</span>
          <strong>${conductor}</strong>
        </div>
      </div>

      <div class="finalizado-rating">
        <p>Notez l'experience</p>
        <div id="ratingStars" class="finalizado-stars" role="group" aria-label="Note">
          <button type="button" data-value="1" aria-label="1 sur 5"><i class="fa-solid fa-star"></i></button>
          <button type="button" data-value="2" aria-label="2 sur 5"><i class="fa-solid fa-star"></i></button>
          <button type="button" data-value="3" aria-label="3 sur 5"><i class="fa-solid fa-star"></i></button>
          <button type="button" data-value="4" aria-label="4 sur 5"><i class="fa-solid fa-star"></i></button>
          <button type="button" data-value="5" aria-label="5 sur 5"><i class="fa-solid fa-star"></i></button>
        </div>
        <div class="finalizado-tags" aria-label="Details rapides">
          <button type="button" data-rating-tag="safe">Securite</button>
          <button type="button" data-rating-tag="clean">Moto propre</button>
          <button type="button" data-rating-tag="polite">Courtoisie</button>
          <button type="button" data-rating-tag="fast">Ponctualite</button>
          <button type="button" data-rating-tag="route">Bon trajet</button>
          <button type="button" data-rating-tag="communication">Communication</button>
        </div>
      </div>

      <textarea id="feedbackViaje" class="finalizado-feedback" maxlength="280" placeholder="Commentaire optionnel"></textarea>
      <p id="finalizadoRatingStatus" class="finalizado-rating-status" aria-live="polite"></p>

      <div class="finalizado-social">
        <span>Siguenos para promociones y novedades</span>
        <div>
          <a href="https://www.facebook.com/search/top?q=bego%20haiti" target="_blank" rel="noopener" aria-label="Facebook BeGO Haiti">
            <i class="fa-brands fa-facebook-f"></i>
          </a>
          <a href="https://www.instagram.com/bego.haiti" target="_blank" rel="noopener" aria-label="Instagram BeGO Haiti">
            <i class="fa-brands fa-instagram"></i>
          </a>
          <a href="https://www.tiktok.com/@bego.ht" target="_blank" rel="noopener" aria-label="TikTok BeGO">
            <i class="fa-brands fa-tiktok"></i>
          </a>
        </div>
      </div>

      <button id="cerrarModalViaje" class="finalizado-btn">Listo</button>
    </div>
  </div>
  <style>
    .finalizado-overlay {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: grid;
      place-items: center;
      padding: max(16px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom));
      background: rgba(2, 6, 23, 0.72);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      animation: finalizadoFade 0.24s ease;
    }
    .finalizado-card {
      width: min(100%, 390px);
      max-height: calc(100vh - 32px);
      overflow: auto;
      color: #f8fafc;
      border-radius: 26px;
      padding: 18px;
      background:
        radial-gradient(circle at 50% -12%, rgba(34, 197, 94, 0.22), transparent 34%),
        linear-gradient(180deg, rgba(24, 31, 43, 0.98), rgba(7, 10, 16, 0.99));
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow:
        0 28px 70px rgba(0, 0, 0, 0.58),
        inset 0 1px 1px rgba(255, 255, 255, 0.08);
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      animation: finalizadoScale 0.24s ease;
    }
    .finalizado-hero {
      text-align: center;
      padding: 8px 8px 14px;
    }
    .finalizado-check {
      width: 62px;
      height: 62px;
      margin: 0 auto 10px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      color: #04130b;
      background: linear-gradient(180deg, #86efac, #22c55e);
      box-shadow: 0 16px 32px rgba(34, 197, 94, 0.26);
      font-size: 1.6rem;
    }
    .finalizado-hero small,
    .finalizado-resumen span,
    .finalizado-total span,
    .finalizado-social span {
      color: #94a3b8;
      font-size: 0.74rem;
      font-weight: 850;
      text-transform: uppercase;
    }
    .finalizado-hero h2 {
      margin: 4px 0;
      font-size: 1.45rem;
      line-height: 1.15;
      letter-spacing: 0;
    }
    .finalizado-hero p {
      margin: 0;
      color: #cbd5e1;
      font-size: 0.92rem;
      line-height: 1.35;
    }
    .finalizado-total {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 14px;
      border-radius: 18px;
      background: rgba(34, 197, 94, 0.1);
      border: 1px solid rgba(34, 197, 94, 0.2);
    }
    .finalizado-total strong {
      color: #86efac;
      font-size: 1.25rem;
      font-weight: 950;
      white-space: nowrap;
    }
    .finalizado-resumen {
      display: grid;
      gap: 10px;
      margin-top: 12px;
      padding: 14px;
      border-radius: 18px;
      background: rgba(2, 6, 23, 0.58);
      border: 1px solid rgba(148, 163, 184, 0.1);
    }
    .finalizado-resumen div {
      display: grid;
      gap: 4px;
    }
    .finalizado-resumen strong {
      min-width: 0;
      color: #f8fafc;
      font-size: 0.9rem;
      line-height: 1.3;
      word-break: break-word;
    }
    .finalizado-rating {
      margin-top: 14px;
      text-align: center;
    }
    .finalizado-rating p {
      margin: 0 0 8px;
      color: #e2e8f0;
      font-size: 0.88rem;
      font-weight: 800;
    }
    .finalizado-stars {
      display: inline-flex;
      gap: 5px;
      min-height: 40px;
      align-items: center;
      justify-content: center;
    }
    .finalizado-stars button {
      width: 38px;
      height: 38px;
      border: 0;
      border-radius: 50%;
      display: grid;
      place-items: center;
      color: rgba(148, 163, 184, 0.5);
      background: rgba(15, 23, 42, 0.76);
      font-size: 1.18rem;
      cursor: pointer;
    }
    .finalizado-stars button.activa {
      color: #facc15;
      background: rgba(250, 204, 21, 0.12);
      box-shadow: inset 0 0 0 1px rgba(250, 204, 21, 0.22);
    }
    .finalizado-tags {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 7px;
      margin-top: 10px;
    }
    .finalizado-tags button {
      min-height: 32px;
      border: 1px solid rgba(148, 163, 184, 0.15);
      border-radius: 999px;
      padding: 0 10px;
      color: #cbd5e1;
      background: rgba(15, 23, 42, 0.72);
      font: inherit;
      font-size: 0.74rem;
      font-weight: 850;
    }
    .finalizado-tags button.selected {
      color: #dbeafe;
      border-color: rgba(96, 165, 250, 0.36);
      background: rgba(37, 99, 235, 0.2);
    }
    .finalizado-feedback {
      width: 100%;
      min-height: 68px;
      margin-top: 12px;
      padding: 13px 14px;
      box-sizing: border-box;
      border: 1px solid rgba(148, 163, 184, 0.16);
      border-radius: 16px;
      outline: 0;
      resize: none;
      color: #fff;
      background: rgba(15, 23, 42, 0.78);
      font: inherit;
      font-size: 0.9rem;
    }
    .finalizado-rating-status {
      min-height: 18px;
      margin: 8px 2px 0;
      color: #93c5fd;
      font-size: 0.78rem;
      text-align: center;
    }
    .finalizado-social {
      margin-top: 12px;
      padding: 13px;
      border-radius: 18px;
      background: rgba(15, 23, 42, 0.72);
      border: 1px solid rgba(148, 163, 184, 0.1);
      text-align: center;
    }
    .finalizado-social div {
      display: flex;
      justify-content: center;
      gap: 10px;
      margin-top: 10px;
    }
    .finalizado-social a {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      color: #fff;
      text-decoration: none;
      background:
        radial-gradient(circle at 34% 26%, rgba(255, 255, 255, 0.22), transparent 18%),
        linear-gradient(180deg, #1f2937, #0f172a);
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 10px 20px rgba(0, 0, 0, 0.28);
    }
    .finalizado-btn {
      width: 100%;
      min-height: 52px;
      margin-top: 14px;
      border: 0;
      border-radius: 17px;
      color: #03130a;
      background: linear-gradient(180deg, #86efac, #22c55e);
      font: inherit;
      font-weight: 950;
      cursor: pointer;
      box-shadow: 0 14px 26px rgba(34, 197, 94, 0.2);
    }
    .finalizado-btn:active {
      transform: scale(0.98);
    }
    .finalizado-btn:disabled {
      opacity: 0.72;
      cursor: wait;
    }
    @keyframes finalizadoFade { from { opacity: 0 } to { opacity: 1 } }
    @keyframes finalizadoScale { from { transform: scale(0.94); opacity: 0 } to { transform: scale(1); opacity: 1 } }
  </style>
  `;

  document.body.appendChild(modal);

  let rating = 5;
  const selectedTags = new Set();
  const starsEl = modal.querySelector("#ratingStars");
  const starButtons = [...modal.querySelectorAll("#ratingStars [data-value]")];
  const tagButtons = [...modal.querySelectorAll("[data-rating-tag]")];
  const statusEl = modal.querySelector("#finalizadoRatingStatus");
  const listoBtn = modal.querySelector("#cerrarModalViaje");

  const renderStars = () => {
    starButtons.forEach((button) => {
      const active = Number(button.dataset.value) <= rating;
      button.classList.toggle("activa", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  };

  if (starsEl) {
    renderStars();
    starButtons.forEach((button) => {
      button.addEventListener("click", () => {
        rating = Math.max(1, Math.min(5, Number(button.dataset.value)));
        renderStars();
      });
    });
  }

  tagButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const tag = button.dataset.ratingTag;
      if (selectedTags.has(tag)) selectedTags.delete(tag);
      else selectedTags.add(tag);
      button.classList.toggle("selected", selectedTags.has(tag));
    });
  });

  listoBtn?.addEventListener("click", async () => {
    const feedback = modal.querySelector("#feedbackViaje")?.value?.trim() || "";
    const ratingPayload = { rating, comentario: feedback, tags: [...selectedTags] };

    if (listoBtn) {
      listoBtn.disabled = true;
      listoBtn.textContent = "Enregistrement...";
    }
    if (statusEl) statusEl.textContent = "";

    try {
      if (viajeId) {
        try {
          await submitViajeRating(viajeId, ratingPayload);
        } catch {
          queuePendingRating(viajeId, ratingPayload);
          if (statusEl) statusEl.textContent = "Connexion instable. La note sera renvoyee.";
        }
      }

      const viajes = JSON.parse(localStorage.getItem("viajes") || "[]");

      viajes.unshift({
        estado: "completado",
        origen: snapshot.origen,
        destino: snapshot.destino,
        fecha: new Date().toLocaleString(),
        motorista: {
          id: motorista.id,
          nombre: motorista.nombre,
          apellido: motorista.apellido,
          foto: motorista.foto
        },
        precio: totalFinal,
        tipoServicio: snapshot.tipoServicio || "viaje",
        rating: {
          score: rating,
          comentario: feedback,
          tags: [...selectedTags],
          pending: !viajeId
        },
        feedback
      });

      if (viajes.length > 50) viajes.pop();
      localStorage.setItem("viajes", JSON.stringify(viajes));
    } catch (err) {
      console.error("Error persistiendo historico de viajes:", err);
    } finally {
      confirmarFinalizacionPendiente(viajeId);
      manejarCancelacionOLimpieza(true);
      modal.remove();
    }
  });
}

function renderCodigoEntrega(viaje) {
  const strip = document.querySelector(".driver-service-strip");
  if (!strip) return;

  const existente = document.getElementById("deliveryCodeCard");
  const esEnvio = viaje.tipo === "envio" || viaje.tipoServicio === "envio";
  const codigo = String(viaje.paquete?.codigoEntrega || "").replace(/\D/g, "").slice(0, 4);

  if (!esEnvio || !codigo) {
    existente?.remove();
    return;
  }

  const html = `
    <small>Codigo de entrega</small>
    <strong>${codigo}</strong>
    <span>Comparte este codigo solo cuando recibas el paquete.</span>
  `;

  if (existente) {
    existente.innerHTML = html;
    return;
  }

  const card = document.createElement("div");
  card.id = "deliveryCodeCard";
  card.className = "delivery-code-card";
  card.innerHTML = html;
  strip.insertAdjacentElement("afterend", card);
}
