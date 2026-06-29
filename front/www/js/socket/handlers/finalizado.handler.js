import { mostrarModalFinalizado } from "../pasajero.utils.js?v=20260629-email-receipt";

export const handleFinalizado = (payload = {}) => {
  if (document.getElementById("modalFinalizado")) return;
  mostrarModalFinalizado(payload.total, payload);
};
