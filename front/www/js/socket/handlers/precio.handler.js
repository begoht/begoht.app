// handlers/precio.handler.js
import { viajeState } from "../../viaje/viaje.state.js";
import { mostrarModalPrecio, mostrarBuscandoMotorista } from "../../pasajero/pasajero.ui.js";
import { guardarSesionViaje, limpiarSesionViaje } from "../pasajero.utils.js";
import { actualizarBotonViaje } from "../../pasajero/ui/boton/botonViaje.ui.js";
import { cityConfig } from "../../map/config/index.js";

// ✅ Agregamos 'rutaGeometria' desestructurada del backend
export const handlePrecio = ({ viajeId, precio, distanciaKm, metodoPago, rutaGeometria }, socket) => {
  
  // Guardamos los datos base y cacheamos la geometría de la ruta si el backend la envió
  Object.assign(viajeState, { 
    viajeId, 
    precio, 
    distanciaKm, 
    precioConfirmado: false,
    // ✅ Guardamos la geometría en el state global para consumirla después sin lag
    rutaDestinoCache: rutaGeometria || null 
  });

  mostrarModalPrecio({
    precio, distanciaKm, metodoPago,
    onConfirm: () => {
      Object.assign(viajeState, { 
        precioConfirmado: true, 
        activo: true, 
        buscando: true, 
        estado: "buscando",
        viajeId 
      });

      guardarSesionViaje("buscando");
      actualizarBotonViaje();
      mostrarBuscandoMotorista(true); 

      socket.emit("confirmar-viaje", { 
        viajeId,
        origen: viajeState.origen,
        destino: viajeState.destino,
        metodoPago: metodoPago,
        city: cityConfig.id
      });
    },
    onCancel: () => {
      if (viajeId) socket.emit("cancelar-viaje", { viajeId });
      limpiarSesionViaje();
      actualizarBotonViaje();
    }
  });
};
