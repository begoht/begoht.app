import { mostrarModalFinalizado } from "../pasajero.utils.js?v=20260605-rating-premium";

export const handleFinalizado = (payload = {}) => {
  if (document.getElementById("modalFinalizado")) return;
  mostrarModalFinalizado(payload.total, payload);
};
