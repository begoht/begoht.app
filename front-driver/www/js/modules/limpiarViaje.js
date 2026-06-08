/**
 * 🧹 LIMPIEZA TOTAL DEL MÓDULO DE VIAJES
 * Resetea mapa, UI, botones, mini preview
 * y libera el estado lógico del motorista.
 */

import { ofertaState } from "./oferta/oferta.state.js";

export function limpiarViaje({
  map,
  rutaLayerRef,
  origenMarkerRef,
  destinoMarkerRef,
  btnIniciar,
  btnFinalizar,
  btnLlegue,
  panelControl,
  estadoBox
}) {
  console.log("🧼 Iniciando limpieza completa del viaje...");

  /*************************************************
   * 0️⃣ LIBERAR ESTADO GLOBAL DEL MOTORISTA
   *************************************************/
  ofertaState.viajeActual = null;
  ofertaState.aceptando = false;
  ofertaState.failSafeTimer = null;
  ofertaState.lastDecisionTs = Date.now();

  console.log("🟢 Motorista liberado correctamente.");

  /*************************************************
   * 1️⃣ LIMPIEZA MAPA PRINCIPAL
   *************************************************/
  if (map) {
    if (rutaLayerRef?.current) {
      map.removeLayer(rutaLayerRef.current);
      rutaLayerRef.current = null;
    }

    if (origenMarkerRef?.current) {
      map.removeLayer(origenMarkerRef.current);
      origenMarkerRef.current = null;
    }

    if (destinoMarkerRef?.current) {
      map.removeLayer(destinoMarkerRef.current);
      destinoMarkerRef.current = null;
    }
  }

  /*************************************************
   * 2️⃣ LIMPIEZA MINI MAPA (PREVIEW PANEL)
   *************************************************/
  try {
    destroyMiniMapa();
  } catch (err) {
    console.warn("⚠️ Mini mapa no estaba activo.");
  }

  /*************************************************
   * 3️⃣ RESET BOTONES
   *************************************************/
  if (btnFinalizar) {
    btnFinalizar.style.display = "none";
    btnFinalizar.disabled = false;
    btnFinalizar.innerText = "Finaliser la course";
  }

  if (btnIniciar) {
    btnIniciar.style.display = "none";
    btnIniciar.disabled = false;
    btnIniciar.innerText = "Demarrer la course";
  }

  if (btnLlegue) {
    btnLlegue.style.display = "none";
    btnLlegue.disabled = false;
  }

  /*************************************************
   * 4️⃣ OCULTAR PANEL CONTROL
   *************************************************/
  if (panelControl) {
    panelControl.style.display = "none";
    panelControl.classList.add("hidden", "oculto");
  }

  /*************************************************
   * 5️⃣ RESET ESTADO VISUAL
   *************************************************/
  if (estadoBox) {
    estadoBox.innerText = "Disponible / En attente de courses";
    estadoBox.classList.remove("viaje-en-curso", "alerta", "activo");
  }

  console.log("✅ Limpieza completa ejecutada correctamente.");
}
