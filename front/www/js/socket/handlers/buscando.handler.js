import { viajeState } from "../../viaje/viaje.state.js";
import { mostrarBuscandoMotorista } from "../../pasajero/pasajero.ui.js";
import { guardarSesionViaje } from "../pasajero.utils.js";
import { actualizarBotonViaje } from "../../pasajero/ui/boton/botonViaje.ui.js?v=20260606-payment-methods";

export const handleBuscando = (data = {}) => {
  Object.assign(viajeState, {
    viajeId: data.viajeId || viajeState.viajeId,
    estado: "buscando",
    activo: true,
    buscando: true,
    asignado: false,
    tipoServicio: data.tipo || viajeState.tipoServicio || "viaje",
    paquete: data.paquete || viajeState.paquete || null,
    precioConfirmado: true
  });

  guardarSesionViaje("buscando");
  mostrarBuscandoMotorista(true);
  actualizarBotonViaje();
};
