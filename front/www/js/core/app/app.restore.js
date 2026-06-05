import { actualizarBotonViaje } from "../../pasajero/ui/boton/botonViaje.ui.js?v=20260605-price-premium-cancel";
import { limpiarMotoristas, mostrarMotoristaEnMapa } from "../../map/map.motorista.js?v=20260604-jacmel-gps";
import { getMap } from "../../map/map.singleton.js";
import { actualizarRutaSegunEstado } from "../../map/map.route.flow.js?v=20260604-jacmel-gps";
import { viajeState } from "../../viaje/viaje.state.js";
import { actualizarUIDriver } from "../../socket/pasajero.utils.js";

let restoring = false;
const ESTADOS_ACTIVOS = ["buscando", "asignado", "reservado", "llego", "en_curso"];

export async function restoreViajeUI() {
  if (restoring) return false;
  restoring = true;

  // 🔥 ACTIVAMOS FLAG 
  window._estadoRealtimeActivo = false;
  window.isRestoringViaje = true;

  try {
    const raw = localStorage.getItem("viajeActivo");
    if (!raw) return false;

    const data = JSON.parse(raw);

    // ===============================
    // 🧹 VALIDACIÓN FUERTE DE ESTADO
    // ===============================
    if (
      !data ||
      !data.estado ||
      (data.estado === "buscando" && !data.precioConfirmado) ||
      !ESTADOS_ACTIVOS.includes(data.estado)
    ) {
      console.log("🧹 Estado inválido → limpiando viajeActivo");
      localStorage.removeItem("viajeActivo");
      return false;
    }

    // ===============================
    // 🧠 RESTAURAR STATE GLOBAL
    // ===============================
    Object.assign(viajeState, {
      activo: true,
      cotizando: false,
      buscando: data.estado === "buscando",
      asignado: ["asignado", "reservado", "llego"].includes(data.estado),
      enCurso: data.estado === "en_curso",
      llego: data.estado === "llego",
      estado: data.estado, // 🔥 IMPORTANTE (fuente real)
      motorista: data.motorista || null,
      viajeId: data.viajeId || null,
      quoteId: null,
      precio: data.precio ?? null,
      precioBase: data.precioBase ?? data.precio ?? null,
      descuentoWallet: data.descuentoWallet || 0,
      descuentoWalletRate: data.descuentoWalletRate || 0,
      walletDiscount: data.walletDiscount || null,
      distanciaKm: data.distanciaKm ?? null,
      duracionMin: data.duracionMin ?? null,
      metodoPago: data.metodoPago ?? null,
      estadoPago: data.estadoPago ?? null,
      tipoServicio: data.tipoServicio || data.tipo || "viaje",
      paquete: data.paquete || null,
      origen: data.origen || null,
      destino: data.destino || null,
      proximoDestino: data.proximoDestino || null,
      precioConfirmado: data.precioConfirmado !== false
    });
    window.viajeState = viajeState;

    actualizarBotonViaje?.();

    // ===============================
    // ⏳ ESPERAR MAPA LISTO
    // ===============================
    await new Promise(requestAnimationFrame);

    const map = getMap();
    if (!map) {
      console.warn("⚠️ Map aún no listo para restore");
      return true;
    }

    // ===============================
    // 🔎 RESTAURAR MODAL BUSCANDO
    // ===============================
    if (data.estado === "buscando") {
      if (
        !document.getElementById("modalPrecio") &&
        !document.getElementById("buscandoMotorista")
      ) {
        import("../../pasajero/ui/overlays/buscandoMotorista.ui.js?v=20260605-price-premium-cancel")
          .then(m => m.mostrarBuscandoMotorista?.(true))
          .catch(err => console.error("❌ Error importando modal:", err));
      }
    }

    // ===============================
    // 🛵 RESTAURAR CONDUCTOR + RUTA
    // ===============================
    if (
      ["asignado", "reservado", "llego", "en_curso"].includes(data.estado)
    ) {

      const menuDriver = document.getElementById("menuDriver");
      const driverAsignado = document.getElementById("driverAsignado");
      const driverLista = document.getElementById("driverLista");

      menuDriver?.classList.remove("oculto");
      driverLista?.classList.add("oculto");
      driverAsignado?.classList.remove("oculto");

      if (data.motorista) {
        limpiarMotoristas();
        mostrarMotoristaEnMapa(data.motorista);
        actualizarUIDriver(data.motorista, data.estado, data);
      }

      /*************************************************
       * 🔥 DIBUJAR RUTA INMEDIATA (CLAVE)
       *************************************************/
      actualizarRutaSegunEstado({
        estado: data.estado,
        motorista: data.motorista,
        origen: data.origen,
        destino: data.destino,
        proximoDestino: data.proximoDestino || null
      });
    }

    return true;
  } catch (err) {
    console.warn("⚠️ Error restaurando viaje:", err);
    localStorage.removeItem("viajeActivo");
    return false;
  } finally {
    restoring = false;

    // 🔥 DESACTIVAMOS FLAG (IMPORTANTE)
    setTimeout(() => {
      window.isRestoringViaje = false;
    }, 300);
  }
}
