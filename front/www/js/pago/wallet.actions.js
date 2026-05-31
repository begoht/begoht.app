import { getServerUrl } from "../conexion";

const SERVER_URL = getServerUrl();

/*************************************************
 * 🔒 BLOQUEAR SALDO AL CREAR VIAJE
 *************************************************/
export async function bloquearSaldoViaje(viajeId) {
  const token = localStorage.getItem("token");

  const res = await fetch(`${SERVER_URL}/api/wallet/bloquear-viaje`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ viajeId }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "No se pudo bloquear saldo");
  }

  return data;
}
