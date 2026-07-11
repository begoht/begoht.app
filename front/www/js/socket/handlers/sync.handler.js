import { viajeState } from "../../viaje/viaje.state.js";
import { actualizarBotonViaje } from "../../pasajero/ui/boton/botonViaje.ui.js?v=20260623-roundtrip-v2";
import { limpiarMotoristas, mostrarMotoristaEnMapa } from "../../map/map.motorista.js?v=20260711-car-route-center";
import { mostrarDestinoEnMapa } from "../../map/map.destino.js?v=20260710-route-camera";
import { ocultarOrigenEnMapa } from "../../map/map.geo.js?v=20260711-map-geo-split";
import { limpiarSesionViaje, actualizarUIDriver } from "../pasajero.utils.js?v=20260711-passenger-profile-photo-utils";
import { actualizarRutaSegunEstado, resetRutaController } from "../../map/map.route.flow.js?v=20260710-route-camera";
import { viajeFueFinalizado } from "../../viaje/viaje.finalizado.local.js?v=20260615-smooth-autofinish";

export const handleSync = (data, socket) => {

  if (data?.activo && data?.viajeId && viajeFueFinalizado(data.viajeId)) {
    console.warn("Sync ignorado: viaje ya finalizado", data.viajeId);
    limpiarSesionViaje();
    actualizarBotonViaje();
    return;
  }

  /*************************************************
   * 🛑 NO HAY VIAJE ACTIVO
   *************************************************/
  if (!data?.activo) {
    console.warn("🧹 Backend dice: no hay viaje activo");

    // 🔥 reset total
    window._estadoRealtimeActivo = false;
    window.isRestoringViaje = false;

    limpiarSesionViaje();
    actualizarBotonViaje();
    return;
  }

  console.log("♻️ Sync real desde backend", data);

  /*************************************************
   * 🔥 MODO RESTORE ACTIVADO
   *************************************************/
  window.isRestoringViaje = true;

  /*************************************************
   * 🧠 1. ACTUALIZAR STATE GLOBAL
   *************************************************/
  Object.assign(viajeState, {
    viajeId: data.viajeId,
    activo: true,
    buscando: false,
    asignado: ["asignado", "reservado", "llego"].includes(data.estado),
    llego: data.estado === "llego",
    enCurso: data.estado === "en_curso",
    estado: data.estado,
    motorista: data.motorista || null,
    origen: data.origen || null,
    destino: data.destino || null,
    tipoServicio: data.tipo || "viaje",
    paquete: data.paquete || null,
    idaVuelta: data.idaVuelta || null,
    precio: data.precio ?? viajeState.precio ?? null,
    precioBase: data.precioBase ?? viajeState.precioBase ?? null,
    descuentoWallet: data.descuentoWallet || 0,
    descuentoWalletRate: data.descuentoWalletRate || 0,
    walletDiscount: data.walletDiscount || null,
    distanciaKm: data.distanciaKm ?? viajeState.distanciaKm ?? null,
    duracionMin: data.duracionMin ?? viajeState.duracionMin ?? null,
    metodoPago: data.metodoPago ?? viajeState.metodoPago ?? null,
    estadoPago: data.estadoPago ?? viajeState.estadoPago ?? null,
    proximoDestino: data.proximoDestino || null,
    precioConfirmado: true
  });

  socket?.emit("join-room", `track:${data.viajeId}`);

  actualizarBotonViaje();
  actualizarUIDriver(data.motorista, data.estado, {
    precio: data.precio,
    precioBase: data.precioBase,
    descuentoWallet: data.descuentoWallet,
    descuentoWalletRate: data.descuentoWalletRate,
    distanciaKm: data.distanciaKm,
    duracionMin: data.duracionMin,
    metodoPago: data.metodoPago,
    estadoPago: data.estadoPago,
    tipoServicio: data.tipo || "viaje",
    paquete: data.paquete || null,
    idaVuelta: data.idaVuelta || null,
    proximoDestino: data.proximoDestino || null
  });

  mostrarDestinoEnMapa(data.estado === "en_curso" ? (data.proximoDestino || data.destino) : data.destino);
  if (["llego", "en_curso"].includes(data.estado)) {
    ocultarOrigenEnMapa();
  }

  /*************************************************
   * 🔄 RESET CONTROLLER (CLAVE 🔥)
   *************************************************/
  resetRutaController();

  /*************************************************
   * 🛵 2. POSICIÓN MOTORISTA
   *************************************************/
  if (data.motorista?.lat != null && data.motorista?.lng != null) {
    limpiarMotoristas();
    mostrarMotoristaEnMapa(data.motorista);
  } else if (data.lat != null && data.lng != null) {
    mostrarMotoristaEnMapa({
      lat: data.lat,
      lng: data.lng,
      heading: data.heading
    });
  }

  /*************************************************
   * 🔥 3. FORZAR RUTA INICIAL SEGURA
   *************************************************/
  // 👉 Solo si aún no llegó realtime
  if (!window._estadoRealtimeActivo) {
    actualizarRutaSegunEstado({
      estado: data.estado,
      motorista: data.motorista,
      origen: data.origen,
      destino: data.destino,
      proximoDestino: data.proximoDestino || null
    });
  } else {
    console.log("🚫 Sync no dibuja ruta (realtime activo)");
  }

  /*************************************************
   * 💾 4. PERSISTENCIA
   *************************************************/
  try {
    localStorage.setItem(
      "viajeActivo",
      JSON.stringify({
        estado: data.estado,
        viajeId: data.viajeId,
        precioConfirmado: true,
        origen: data.origen,
        destino: data.destino,
        motorista: data.motorista,
        tipoServicio: data.tipo || "viaje",
        paquete: data.paquete || null,
        idaVuelta: data.idaVuelta || null,
        proximoDestino: data.proximoDestino || null
      })
    );
  } catch (err) {
    console.warn("⚠️ No se pudo guardar la sesión:", err);
  }

  /*************************************************
   * ⏳ DESBLOQUEAR RESTORE (DESPUÉS DE 1 FRAME)
   *************************************************/
  setTimeout(() => {
    window.isRestoringViaje = false;
    console.log("✅ Restore completado, controller activo");
  }, 300);
};

