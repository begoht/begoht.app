import { mostrarModalFinalizado } from "../pasajero.utils.js?v=20260628-receipt-recovery";

export const handleFinalizado = (payload = {}) => {
  if (document.getElementById("modalFinalizado")) return;
  mostrarModalFinalizado(payload.total, payload);
};
