// handlers/precio.handler.js
import { viajeState } from "../../viaje/viaje.state.js";
import { mostrarModalPrecio, mostrarBuscandoMotorista } from "../../pasajero/pasajero.ui.js";
import { guardarSesionViaje } from "../pasajero.utils.js?v=20260628-dark-route-locked";
import { actualizarBotonViaje } from "../../pasajero/ui/boton/botonViaje.ui.js?v=20260623-roundtrip-v2";
import { cityConfig } from "../../map/config/index.js?v=20260624-cordoba-gps";
import { resolverCotizacionPendiente, resetCotizacionPendiente } from "../../viaje/viaje.actions.js?v=20260628-dark-route-locked";
import { viajeFueFinalizado } from "../../viaje/viaje.finalizado.local.js?v=20260607-finalized-guard";
import {
  aplicarSeleccionIdaVuelta,
  distanciaSegunSeleccion,
  normalizarIdaVuelta,
  precioSegunSeleccion
} from "../../viaje/idaVuelta.js?v=20260623-roundtrip-v2";

// ✅ Agregamos 'rutaGeometria' desestructurada del backend
export const handlePrecio = ({ quoteId, viajeId, precio, precioBase, descuentoWallet, descuentoWalletRate, walletDiscount, distanciaKm, metodoPago, rutaGeometria, tipo, paquete, idaVuelta }, socket) => {
  if (viajeId && viajeFueFinalizado(viajeId)) {
    console.warn("Precio ignorado: viaje ya finalizado", viajeId);
    return;
  }

  if (!resolverCotizacionPendiente(quoteId)) {
    console.warn("Cotizacion vieja ignorada:", quoteId);
    return;
  }
  
  // Guardamos los datos base y cacheamos la geometría de la ruta si el backend la envió
  Object.assign(viajeState, { 
    quoteId: quoteId || viajeState.quoteId,
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
    idaVuelta: normalizarIdaVuelta(idaVuelta),
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
    idaVuelta: viajeState.idaVuelta,
    onConfirm: (confirmacion = {}) => {
      const idaVueltaConfirmada = aplicarSeleccionIdaVuelta(
        viajeState.idaVuelta,
        confirmacion?.idaVuelta?.solicitada === true
      );
      const precioConfirmado = precioSegunSeleccion(
        idaVueltaConfirmada,
        idaVueltaConfirmada?.solicitada === true,
        precio
      );
      const distanciaConfirmada = distanciaSegunSeleccion(
        idaVueltaConfirmada,
        idaVueltaConfirmada?.solicitada === true,
        distanciaKm
      );

      Object.assign(viajeState, { 
        precioConfirmado: true, 
        activo: true, 
        buscando: true, 
        estado: "buscando",
        viajeId,
        idaVuelta: idaVueltaConfirmada,
        precio: precioConfirmado,
        distanciaKm: distanciaConfirmada
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
        paquete: viajeState.tipoServicio === "envio" ? viajeState.paquete : null,
        idaVuelta: idaVueltaConfirmada
          ? { solicitada: idaVueltaConfirmada.solicitada === true }
          : { solicitada: false }
      });
    },
    onCancel: () => {
      if (viajeId) socket.emit("cancelar-viaje", { viajeId });
      resetCotizacionPendiente();
      actualizarBotonViaje();
    }
  });
};
