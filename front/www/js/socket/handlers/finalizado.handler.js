import { mostrarModalFinalizado } from "../pasajero.utils.js?v=20260713-live-trip-tracking";

export const handleFinalizado = (payload = {}) => {
  if (document.getElementById("modalFinalizado")) return;
  mostrarModalFinalizado(payload.total, payload);
};
