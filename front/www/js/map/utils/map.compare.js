/*************************************************
 * 📍 MISMA POSICIÓN
 *************************************************/
export function mismaPosicion(a, b) {

  if (!a || !b) return false;

  return (
    Math.abs(a.lat - b.lat) < 0.00005 &&
    Math.abs(a.lng - b.lng) < 0.00005
  );
}

/*************************************************
 * 🎯 MISMO TARGET
 *************************************************/
export function mismoTarget(a, b) {

  if (!a && !b) return true;

  if (!a || !b) return false;

  return mismaPosicion(a, b);
}