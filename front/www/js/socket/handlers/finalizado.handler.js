import { mostrarModalFinalizado } from "../pasajero.utils.js?v=20260601-finalizado-social";

export const handleFinalizado = ({ total }) => {
  if (document.getElementById("modalFinalizado")) return;
  mostrarModalFinalizado(total);
};
