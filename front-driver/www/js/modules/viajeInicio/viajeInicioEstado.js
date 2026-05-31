/**
 * ESTADO LOCAL DE INTERACCIÓN
 */
export const UI_REFS = {
    btnIniciar: null,
    btnFinalizar: null,
    btnLlegue: null,
    estadoBox: null,
    panelControl: null
};

export let clickLock = false;
export let llegadaTimeout = null;

export function setClickLock(val) { clickLock = val; }
export function setLlegadaTimeout(val) { llegadaTimeout = val; }