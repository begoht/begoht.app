import { getServerUrl } from "./conexion.js";

/*************************************************
 * WALLET – SPA READY
 *************************************************/
export async function initWalletUI() {
  const saldoEl = document.getElementById("saldoWallet");
  if (!saldoEl) return;

  const token = localStorage.getItem("token");

  if (!token) {
    saldoEl.textContent = "0 HTG";
    return;
  }

  try {
    const res = await fetch(
      `${getServerUrl()}/api/wallet`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!res.ok) throw new Error();

    const wallet = await res.json();
    const saldo = wallet?.saldo ?? 0;

    saldoEl.textContent = `${saldo.toFixed(2)} HTG`;

  } catch (err) {
    console.error("❌ Error wallet:", err);
    saldoEl.textContent = "0 HTG";
  }
}
