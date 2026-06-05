// handlers/precio.handler.js
import { viajeState } from "../../viaje/viaje.state.js";
import { mostrarModalPrecio, mostrarBuscandoMotorista } from "../../pasajero/pasajero.ui.js";
import { guardarSesionViaje, limpiarSesionViaje } from "../pasajero.utils.js";
import { actualizarBotonViaje } from "../../pasajero/ui/boton/botonViaje.ui.js";
import { cityConfig } from "../../map/config/index.js";

// ✅ Agregamos 'rutaGeometria' desestructurada del backend
export const handlePrecio = ({ viajeId, precio, precioBase, descuentoWallet, descuentoWalletRate, walletDiscount, distanciaKm, metodoPago, rutaGeometria, tipo, paquete }, socket) => {
  
  // Guardamos los datos base y cacheamos la geometría de la ruta si el backend la envió
  Object.assign(viajeState, { 
    viajeId, 
    precio, 
    distanciaKm, 
    tipoServicio: tipo || viajeState.tipoServicio || "viaje",
    paquete: paquete || viajeState.paquete || null,
    precioConfirmado: false,
    precioBase: precioBase ?? precio,
    descuentoWallet: descuentoWallet || 0,
    descuentoWalletRate: descuentoWalletRate || 0,
    walletDiscount: walletDiscount || null,
    // ✅ Guardamos la geometría en el state global para consumirla después sin lag
    rutaDestinoCache: rutaGeometria || null 
  });

  mostrarModalPrecio({
    precio,
    precioBase: precioBase ?? precio,
    descuentoWallet: descuentoWallet || 0,
    descuentoWalletRate: descuentoWalletRate || 0,
    walletDiscount: walletDiscount || null,
    distanciaKm,
    metodoPago,
    tipo: viajeState.tipoServicio,
    paquete: viajeState.paquete,
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
        city: cityConfig.id,
        tipo: viajeState.tipoServicio || "viaje",
        paquete: viajeState.tipoServicio === "envio" ? viajeState.paquete : null
      });
    },
    onCancel: () => {
      if (viajeId) socket.emit("cancelar-viaje", { viajeId });
      limpiarSesionViaje();
      actualizarBotonViaje();
    }
  });
};
