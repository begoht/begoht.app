import { initGeo } from "../map/map.geo.js?v=20260607-jacmel-reference-icons";
import { initSeleccionDestino } from "../map/map.destino.js?v=20260605-price-premium-cancel";
import { actualizarBotonViaje } from "../pasajero/pasajero.ui.js?v=20260615-smooth-autofinish";
import { initPaymentMethodSettings, initToggleMenuDriver, seleccionarPago } from "./pasajero.ui.js?v=20260615-smooth-autofinish";
import { getSocket } from "../socket/socket.js?v=20260606-session-refresh";
import { initPasajeroSocket } from "../socket/pasajero.socket.js?v=20260615-smooth-autofinish";
import { setMapa, limpiarMotoristas } from "../map/map.motorista.js?v=20260615-smooth-autofinish";
import { initSavedDestinations } from "../map/map.saved-destinations.js?v=20260606-map-shell-controls";
import { initEnvioPaquete } from "./envio.paquete.js?v=20260606-legal-trust";
import { initHomeOffers } from "../promos/passenger-offers.js?v=20260604-admin-offers";
import { initWalletDiscountUI } from "./wallet-discount.js?v=20260605-price-premium-cancel";

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
    limpiarMotoristas();

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

    if (!window.pasajeroInicializado) {
      initPasajeroSocket();

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
