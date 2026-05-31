// pasajero/ui.js
import { viajeState } from "../viaje/viaje.state.js";
import { actualizarBotonViaje } from "../pasajero/ui/boton/botonViaje.ui.js";
import { cerrarBuscandoMotorista } from "../pasajero/pasajero.ui.js";
import { limpiarViajePasajero } from "../socket/viaje.limpieza.js";
import { limpiarRutas } from "../map/map.ruta.js";
import { initDriverMinimize } from "../ui/driver.minimize.js";
import { resetRutaController } from "../map/map.route.flow.js";
import { actualizarETA, resetETA } from "../pasajero/pasajero.eta.js";

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
      precio: viajeState.precio,
      distanciaKm: viajeState.distanciaKm,
      duracionMin: viajeState.duracionMin,
      metodoPago: viajeState.metodoPago,
      estadoPago: viajeState.estadoPago,
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
    activo: false, buscando: false, asignado: false, llego: false, enCurso: false,
    viajeId: null, motorista: null, precioConfirmado: false,
    precio: null, distanciaKm: null, duracionMin: null,
    metodoPago: null, estadoPago: null,
    metodoPagosaldoBloqueado: false, destino: null, estado: null,
    finalizado: false, cancelado: false, expirado: false,
    proximoDestino: null
  });

  resetETA();
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
  setText("driverTripId", viaje.viajeId ? `Viaje ${String(viaje.viajeId).slice(-6).toUpperCase()}` : "Viaje activo");
  setText("driverPrecio", formatMoney(viaje.precio));
  setText("driverPago", formatPago());
  setText("driverDistancia", formatKm(viaje.distanciaKm));
  setText("driverEtaText", formatEta());
  setText("driverOrigen", truncar(viaje.origen?.direccion || viaje.origen?.address || "Origen confirmado", 54));
  setText("driverDestino", truncar(viaje.destino?.direccion || viaje.destino?.address || "Destino confirmado", 54));

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

  if (typeof initDriverMinimize === "function") {
    initDriverMinimize();
  }
}

/**
 * Inyecta y controla el ciclo de vida del modal de finalización y feedback del viaje
 * @param {number|string} total Monto total calculado del servicio
 */
export function mostrarModalFinalizado(total) {
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
