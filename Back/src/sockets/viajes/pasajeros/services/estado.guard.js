/*************************************************
 * 🛡️ ESTADO GUARD (ANTI ESTADOS INVÁLIDOS)
 *************************************************/

const estadosActivos = new Map(); 
// userId -> { estado, viajeId }

function getUserId(socket) {
  return socket.user?.id || socket.id;
}

/*************************************************
 * 🔎 VERIFICAR SI PUEDE PEDIR VIAJE
 *************************************************/
function puedePedirViaje(socket) {
  const userId = getUserId(socket);
  const actual = estadosActivos.get(userId);

  if (!actual) return true;

  // estados bloqueantes
  if (["buscando", "asignado", "en_curso"].includes(actual.estado)) {
    return false;
  }

  return true;
}

/*************************************************
 * 🧠 SET ESTADO
 *************************************************/
function setEstado(socket, estado, viajeId = null) {
  const userId = getUserId(socket);

  estadosActivos.set(userId, {
    estado,
    viajeId
  });
}

/*************************************************
 * 🧹 LIMPIAR ESTADO
 *************************************************/
function clearEstado(socket) {
  const userId = getUserId(socket);
  estadosActivos.delete(userId);
}

/*************************************************
 * 📤 GET ESTADO
 *************************************************/
function getEstado(socket) {
  const userId = getUserId(socket);
  return estadosActivos.get(userId) || null;
}

module.exports = {
  puedePedirViaje,
  setEstado,
  clearEstado,
  getEstado
};