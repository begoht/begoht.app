import { mostrarModalFinalizado } from "../pasajero.utils.js";

export const handleFinalizado = ({ total }) => {
  if (document.getElementById("modalFinalizado")) return;
  mostrarModalFinalizado(total);
};