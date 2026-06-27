// js/viaje/viaje.limpieza.js
import { viajeState } from "../viaje/viaje.state.js";
import { actualizarBotonViaje } from "../pasajero/ui/boton/botonViaje.ui.js?v=20260627-map-fluid-arrival";
import { eliminarMotoristaDelMapa } from "../map/map.motorista.js?v=20260627-map-fluid-arrival";
import { getMap } from "../map/map.singleton.js?v=20260627-map-fluid-arrival";
import { getSocket } from "../socket/socket.js?v=20260606-session-refresh";
import { destroyPasajeroSocket } from "./pasajero.socket.js";

/**
 * Limpia toda la información de un viaje para el pasajero,
 * incluyendo el panel, botones, marcador de motorista y rutas del mapa.
 * @param {Object} params - Parámetros opcionales para limpieza por referencia.
 */
export function limpiarViajePasajero({ map, limpiarMapa = true, rutaLayerRef, origenMarkerRef, destinoMarkerRef } = {}) {
  console.log("🧹 Ejecutando limpiarViajePasajero() completo");

  try {
    /********************* 0. 🔥 LIMPIEZA DE STORAGE *********************/
    localStorage.removeItem("viajeActivo");
    sessionStorage.removeItem("viajeActivo");


    /********************* 1. ESTADO INTERNO (RESET TOTAL) *********************/
    viajeState.activo = false;
    viajeState.cotizando = false;
    viajeState.estado = null; // 🔓 Libera el bloqueo de clicks en el mapa
    viajeState.buscando = false;
    viajeState.asignado = false;
    viajeState.llego = false;
    viajeState.enCurso = false;
    viajeState.finalizado = false;
    viajeState.viajeId = null;
    viajeState.quoteId = null;
    viajeState.motorista = null;
    viajeState.proximoDestino = null;
    viajeState.metodoPago = null;
    viajeState.estadoPago = null;
    viajeState.precio = null;
    viajeState.precioBase = null;
    viajeState.descuentoWallet = 0;
    viajeState.descuentoWalletRate = 0;
    viajeState.walletDiscount = null;
    viajeState.distanciaKm = null;
    viajeState.duracionMin = null;
    viajeState.precioConfirmado = false;
    viajeState.metodoPagosaldoBloqueado = false;

    // 🔥 Limpiar coordenadas para poder pedir uno nuevo desde cero
    viajeState.destino = null;

    /********************* 2. MENÚ, PANELES Y INPUTS UI *********************/
    const menuDriver = document.getElementById("menuDriver");
    const lista = document.getElementById("driverLista");
    const asignado = document.getElementById("driverAsignado");
    const overlay = document.getElementById("overlayBuscando");

    if (typeof window.resetDriverBubble === "function") window.resetDriverBubble();
    if (menuDriver) menuDriver.classList.add("oculto");
    if (lista) lista.classList.remove("oculto");
    if (asignado) {
      asignado.classList.add("oculto");
      asignado.classList.remove("minimizado");
    }
    if (overlay) overlay.style.display = "none";

    // ✍️ Limpiar cajas de texto de direcciones

    const inputDestino = document.getElementById("inputDestino");
    if (inputDestino) inputDestino.value = "";

    // 🗑️ Cerrar modales residuales
    document.getElementById("modalPrecio")?.remove();
    document.getElementById("buscandoMotorista")?.remove();
    document.getElementById("modalFinalizado")?.remove();

    /********************* 3. DATOS DEL CONDUCTOR *********************/
    const setText = (id, val = "—") => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setText("driverNombre");
    setText("driverTelefono");
    setText("driverPlaca");
    setText("driverRating");
    setText("driverDistancia", "0.00 km");
    setText("driverEtaText", "-- min");
    setText("driverPrecio", "--");
    setText("driverPago", "--");
    setText("driverOrigen", "Origen confirmado");
    setText("driverDestino", "Destino confirmado");
    setText("driverTripId", "Viaje activo");
    setText("driverVehicleColor", "Vehiculo verificado");

    const img = document.getElementById("driverFoto");
    if (img) img.src = "assets/logo_primcial.png"; 

    const etaBar = document.getElementById("driverEtaBar");
    if (etaBar) etaBar.style.width = "0%";

    /********************* 4. ESTADO DEL VIAJE *********************/
    const estadoBox = document.getElementById("estadoViaje");
    if (estadoBox) estadoBox.innerText = "";

    const precioBox = document.getElementById("precioBox");
    if (precioBox) precioBox.innerText = "Precio estimado: —";

    /********************* 5. MAPA (MARCADORES Y RUTAS) *********************/
    eliminarMotoristaDelMapa();

    const currentMap = map || getMap();
    const isValidMap = currentMap && typeof currentMap.removeLayer === "function";

    if (isValidMap && limpiarMapa) {
      
      // Limpiar marcador de destino guardado en el state
      if (viajeState.destinoMarker) {
        if (currentMap.hasLayer(viajeState.destinoMarker)) {
          currentMap.removeLayer(viajeState.destinoMarker);
        }
        viajeState.destinoMarker = null;
      }

      // Limpiar por referencias (si vienen del mapa)
      if (rutaLayerRef?.current && currentMap.hasLayer(rutaLayerRef.current)) {
        currentMap.removeLayer(rutaLayerRef.current);
        rutaLayerRef.current = null;
      }

      if (origenMarkerRef?.current && currentMap.hasLayer(origenMarkerRef.current)) {
        currentMap.removeLayer(origenMarkerRef.current);
        origenMarkerRef.current = null;
      }

      // Limpiar capas globales de rutas (Premium System)
      const capasGlobales = [
        "rutaLayer",
        "rutaGlow",
        "rutaOutline",
        "rutaAnimada",
        "rutaActualLayer",
        "rutaFuturaLayer",
        "rutaSombra",
        "userMarker"
      ];

      capasGlobales.forEach((capa) => {
        const layer = window[capa];
        if (layer && currentMap.hasLayer?.(layer)) {
          currentMap.removeLayer(layer);
        }
        window[capa] = null;
      });

    }

    /********************* 6. TIMERS Y EVENTOS *********************/
    if (window.etaInterval) {
      clearInterval(window.etaInterval);
      window.etaInterval = null;
    }

    if (window._viewportHandler && currentMap) {
      currentMap.off("moveend", window._viewportHandler);
      window._viewportHandler = null;
    }

    /********************* 7. ACTUALIZAR BOTÓN *********************/
    // Al haber puesto origen/destino en null y estado en null, 
    // el botón debería volver a su estado inicial (gris/deshabilitado).
    actualizarBotonViaje();

    console.log("✅ Sistema reseteado: Listo para nuevo viaje.");

  } catch (err) {
    console.error("💥 Error crítico limpiando viaje:", err);
  }
}

/**
 * Remueve todos los listeners del socket y limpia la UI.
 */
export function cleanupPasajero() {
  // 1. Usar la función oficial para destruir sockets y resetear la bandera
  destroyPasajeroSocket();

  // 2. Limpiar el mapa y la UI
  limpiarViajePasajero();

  console.log("🧹 Cleanup pasajero FULL OK");
}
