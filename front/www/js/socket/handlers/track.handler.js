import { viajeState } from "../../viaje/viaje.state.js";
import { mostrarMotoristaEnMapa } from "../../map/map.motorista.js?v=20260625-map-instant";
import { mostrarDestinoEnMapa } from "../../map/map.destino.js?v=20260625-map-instant";
import { ocultarOrigenEnMapa } from "../../map/map.geo.js?v=20260625-map-instant";
import { actualizarRutaSegunEstado, resetRutaController } from "../../map/map.route.flow.js?v=20260625-map-instant";
import { guardarSesionViaje, actualizarUIDriver } from "../pasajero.utils.js?v=20260625-map-instant";
import { getMap } from "../../map/map.singleton.js?v=20260625-map-instant";
import { viajeFueFinalizado } from "../../viaje/viaje.finalizado.local.js?v=20260615-smooth-autofinish";

let lastEstadoPersistido = null;
let rutaInicialRenderizada = false;

// 🔥 Jerarquía real de estados
const JERARQUIA = {
  "asignado": 1,
  "aceptado": 1,
  "reservado": 1,
  "llego": 2,
  "en_curso": 3,
  "finalizado": 4
};

// 🔥 estados válidos (anti-basura)
const ESTADOS_TRACK = [
  "asignado",
  "aceptado",
  "reservado",
  "llego",
  "en_curso"
];

export const handleTrack = (data) => {
  if (data?.viajeId && viajeFueFinalizado(data.viajeId)) {
    console.warn("Track ignorado: viaje ya finalizado", data.viajeId);
    return;
  }

  if (viajeState.finalizado) {
    console.warn("⚠️ Track ignorado: finalizado");
    return;
  }

  if (!data || !viajeState.viajeId) return;

  // 🛡️ anti-track zombie
  if (
    data.viajeId &&
    data.viajeId !== viajeState.viajeId
  ) {
    console.warn("⚠️ Track viejo ignorado");
    return;
  }

  
  if (!data || !viajeState.viajeId) return;

  const {
    lat,
    lng,
    heading,
    estado: estadoServer,
    origen,
    destino,
    proximoDestino,
    idaVuelta,
    distancia,
    eta
  } = data;

  if (lat == null || lng == null) return;

  const map = getMap();
  if (!map) return;

  /*************************************************
   * 1. MOTORISTA SIEMPRE
   *************************************************/
  mostrarMotoristaEnMapa({ lat, lng, heading });

  /*************************************************
   * 2. FILTRO DE ESTADO (CRÍTICO)
   *************************************************/
  let estadoSeguro = viajeState.estado;

  if (ESTADOS_TRACK.includes(estadoServer)) {
    const nivelActual = JERARQUIA[viajeState.estado] || 0;
    const nivelNuevo = JERARQUIA[estadoServer] || 0;

    if (nivelNuevo >= nivelActual) {
      if (estadoServer !== viajeState.estado) {
        console.log(`⚡ Sync estado desde track: ${estadoServer}`);
        estadoSeguro = estadoServer;
        rutaInicialRenderizada = false;
      }
    }
  } else {
    // 🔥 ignorar estados corruptos tipo "desconocido"
    estadoSeguro = viajeState.estado;
  }

  viajeState.estado = estadoSeguro;

  /*************************************************
   * 3. SYNC CONTEXTO
   *************************************************/
  viajeState.motorista = {
    ...viajeState.motorista,
    lat,
    lng,
    heading
  };

  if (origen) viajeState.origen = origen;
  if (destino) {
    viajeState.destino = destino;
  }
  if (proximoDestino) viajeState.proximoDestino = proximoDestino;
  if (idaVuelta) viajeState.idaVuelta = idaVuelta;

  /*************************************************
   * 4. CONDICIÓN DE RUTA (FIX CLAVE 🔥)
   *************************************************/
  const estadoFinal = viajeState.estado;
  if (estadoFinal === "en_curso") {
    ocultarOrigenEnMapa();
  }

  const targetVisual = estadoFinal === "en_curso"
    ? (viajeState.proximoDestino || viajeState.destino)
    : viajeState.destino;

  if (targetVisual) {
    mostrarDestinoEnMapa(targetVisual);
  }

  const tieneTargetAsignado =
    proximoDestino || viajeState.origen;

  const puedeRenderizar =
    (estadoFinal === "en_curso" && (viajeState.proximoDestino || viajeState.destino)) ||
    (["asignado", "aceptado"].includes(estadoFinal) && tieneTargetAsignado) ||
    (estadoFinal === "reservado" && viajeState.origen) ||
    estadoFinal === "llego";

  if (puedeRenderizar) {
    if (!rutaInicialRenderizada) {
      resetRutaController();
      rutaInicialRenderizada = true;
    }

    actualizarRutaSegunEstado({
      estado: estadoFinal,
      motorista: viajeState.motorista,
      origen: viajeState.origen,
      destino: viajeState.destino,
      proximoDestino: proximoDestino || viajeState.proximoDestino || null
    });
  }

  /*************************************************
   * 5. UI
   *************************************************/
  actualizarUIDriver(viajeState.motorista, estadoFinal, {
    eta,
    distancia,
    origen: viajeState.origen,
    destino: viajeState.destino,
    proximoDestino: proximoDestino || viajeState.proximoDestino || null,
    idaVuelta: viajeState.idaVuelta || null
  });
  actualizarTextoEstado(estadoFinal, distancia, eta);

  /*************************************************
   * 6. PERSISTENCIA
   *************************************************/
  if (estadoFinal !== lastEstadoPersistido) {
    guardarSesionViaje(estadoFinal);
    lastEstadoPersistido = estadoFinal;
  }
};

/*************************************************
 * 🧾 TEXTO UI
 *************************************************/
function actualizarTextoEstado(estado, distancia, eta) {
  const box = document.getElementById("estadoViaje");
  if (!box) return;

  const distNum = Number(distancia);
  const distText = Number.isFinite(distNum) && distNum > 0
    ? `${distNum < 10 ? distNum.toFixed(1) : Math.round(distNum)} km`
    : "Cerca";
  const etaText = eta ? ` | ⏱ ${eta} min` : "";

  const textos = {
    "en_curso": "🚀 En camino al destino...",
    "llego": "📍 ¡El conductor llegó!",
    "reservado": "⌛ El conductor está terminando un viaje...",
    "asignado": `🛵 Conductor en camino: ${distText}${etaText}`,
    "aceptado": `🛵 Conductor en camino: ${distText}${etaText}`
  };

  box.innerText = textos[estado] || "Buscando conductor...";
}

window.__resetTrackHandler = () => {
  lastEstadoPersistido = null;
  rutaInicialRenderizada = false;
};
