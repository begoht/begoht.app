import { initGeo } from "../map/map.geo.js?v=20260624-origin-gps";
import { initSeleccionDestino } from "../map/map.destino.js?v=20260624-origin-gps";
import { actualizarBotonViaje } from "../pasajero/pasajero.ui.js?v=20260624-origin-gps";
import { initPaymentMethodSettings, initToggleMenuDriver, seleccionarPago } from "./pasajero.ui.js?v=20260624-origin-gps";
import { getSocket } from "../socket/socket.js?v=20260606-session-refresh";
import { initPasajeroSocket } from "../socket/pasajero.socket.js?v=20260624-origin-gps";
import { setMapa, limpiarMotoristas } from "../map/map.motorista.js?v=20260621-route-moto";
import { initSavedDestinations } from "../map/map.saved-destinations.js?v=20260624-origin-gps";
import { initEnvioPaquete } from "./envio.paquete.js?v=20260619-clear-map-address";
import { initHomeOffers } from "../promos/passenger-offers.js?v=20260604-admin-offers";
import { initWalletDiscountUI } from "./wallet-discount.js?v=20260605-price-premium-cancel";
import { viajeState } from "../viaje/viaje.state.js";

let initIdGlobal = 0;

export function initPasajero(map) {
  const currentInitId = ++initIdGlobal;

  console.log("Init pasajero (modo PRO)");

  if (!document.querySelector(".home-page")) {
    console.warn("initPasajero cancelado (no es HOME real)");
    return;
  }

  if (!map) {
    console.warn("mapa no recibido");
    return;
  }

  try {
    if (currentInitId !== initIdGlobal) return;

    setMapa(map);
    if (!viajeState.activo) {
      limpiarMotoristas();
    }

    const socket = getSocket();

    initGeo(map);
    initSeleccionDestino(map);
    initSavedDestinations(map);
    initEnvioPaquete();
    initWalletDiscountUI();
    initPaymentMethodSettings();
    initHomeOffers();

    initToggleMenuDriver();
    window.seleccionarPago = seleccionarPago;

    const bindClick = (el, handler) => {
      if (!el) return;
      el.replaceWith(el.cloneNode(true));
      const newEl = document.getElementById(el.id);
      newEl?.addEventListener("click", handler);
    };

    bindClick(document.getElementById("btnPagoEfectivo"), (e) =>
      seleccionarPago("efectivo", e.currentTarget)
    );

    bindClick(document.getElementById("btnPagoTransfer"), (e) =>
      seleccionarPago("transferencia", e.currentTarget)
    );

    initPasajeroSocket();

    if (!window.pasajeroInicializado) {
      if (socket && !socket.__passengerReadyLogBound) {
        socket.__passengerReadyLogBound = true;
        socket.on("connect", () => {
          console.log("Socket listo (pasajero)");
        });
      }

      window.pasajeroInicializado = true;
    }

    actualizarBotonViaje();
  } catch (err) {
    console.error("Error critico en initPasajero:", err);
  }
}
