import { mostrarModalFinalizado } from "../pasajero.utils.js?v=20260711-passenger-profile-photo-utils";

export const handleFinalizado = (payload = {}) => {
  if (document.getElementById("modalFinalizado")) return;
  mostrarModalFinalizado(payload.total, payload);
};
