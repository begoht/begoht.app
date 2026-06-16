import { getWalletLandingCard } from "../wallet/wallet.landing.js";

export const LANDING_SERVICES = Object.freeze([
  Object.freeze({
    id: "taxi",
    icon: "bx bx-user-voice",
    title: "Moto-Taxi Express",
    body: "Solicita un viaje seguro en dos ruedas al instante, con tarifa clara y seguimiento activo.",
    theme: ""
  }),
  Object.freeze({
    id: "colis",
    icon: "bx bx-package",
    title: "Envios y mensajeria",
    body: "Mueve paquetes y documentos con confirmacion, rastreo y estados visibles durante el trayecto.",
    theme: "orange-theme"
  }),
  Object.freeze(getWalletLandingCard())
]);
