import { mostrarModalFinalizado } from "../pasajero.utils.js?v=20260607-finalized-guard";

export const handleFinalizado = (payload = {}) => {
  if (document.getElementById("modalFinalizado")) return;
  mostrarModalFinalizado(payload.total, payload);
};
