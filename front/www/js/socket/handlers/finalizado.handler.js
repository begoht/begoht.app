import { mostrarModalFinalizado } from "../pasajero.utils.js?v=20260710-photo-fix";

export const handleFinalizado = (payload = {}) => {
  if (document.getElementById("modalFinalizado")) return;
  mostrarModalFinalizado(payload.total, payload);
};
