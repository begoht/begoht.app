import { viajeState } from "../../viaje/viaje.state.js";
import { mostrarMotoristaEnMapa } from "../../map/map.motorista.js?v=20260603-road-heading";
import {
  mostrarBuscandoMotorista,
  actualizarMotoristaCandidato
} from "../../pasajero/pasajero.ui.js";

export const handleMotoristaCandidato = (data = {}) => {
  if (!data.motorista) return;

  if (
    data.viajeId &&
    viajeState.viajeId &&
    data.viajeId !== viajeState.viajeId
  ) {
    return;
  }

  if (!["buscando", "ofertando"].includes(viajeState.estado)) {
    return;
  }

  mostrarBuscandoMotorista(true);
  actualizarMotoristaCandidato(data.motorista);
  mostrarMotoristaEnMapa(data.motorista);
};
