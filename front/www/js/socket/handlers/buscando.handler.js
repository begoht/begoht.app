import { viajeState } from "../../viaje/viaje.state.js";
import { mostrarBuscandoMotorista } from "../../pasajero/pasajero.ui.js?v=20260623-roundtrip-v2";
import { guardarSesionViaje } from "../pasajero.utils.js?v=20260627-map-rotate";
import { actualizarBotonViaje } from "../../pasajero/ui/boton/botonViaje.ui.js?v=20260623-roundtrip-v2";
import { viajeFueFinalizado } from "../../viaje/viaje.finalizado.local.js?v=20260607-finalized-guard";

export const handleBuscando = (data = {}) => {
  if (data.viajeId && viajeFueFinalizado(data.viajeId)) {
    console.warn("Busqueda ignorada: viaje ya finalizado", data.viajeId);
    return;
  }

  Object.assign(viajeState, {
    viajeId: data.viajeId || viajeState.viajeId,
    estado: "buscando",
    activo: true,
    buscando: true,
    asignado: false,
    tipoServicio: data.tipo || viajeState.tipoServicio || "viaje",
    paquete: data.paquete || viajeState.paquete || null,
    idaVuelta: data.idaVuelta || viajeState.idaVuelta || null,
    precioConfirmado: true
  });

  guardarSesionViaje("buscando");
  mostrarBuscandoMotorista(true);
  actualizarBotonViaje();
};
