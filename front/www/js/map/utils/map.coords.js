/*************************************************
 * 📍 MISMA POSICIÓN
 *************************************************/
export function mismaPosicion(a, b) {

  if (!a || !b) return false;

  return (
    Math.abs(a.lat - b.lat) < 0.0003 &&
    Math.abs(a.lng - b.lng) < 0.0003
  );
}

/*************************************************
 * 📍 COORDS VÁLIDAS
 *************************************************/
export function coordsValidas(p) {

  return (
    p &&
    typeof p.lat === "number" &&
    typeof p.lng === "number" &&
    !isNaN(p.lat) &&
    !isNaN(p.lng)
  );
}