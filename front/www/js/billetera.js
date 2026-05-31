import { getServerUrl } from "./conexion.js";

document.addEventListener("DOMContentLoaded", async () => {
  const saldoEl = document.getElementById("saldo");
  const lista = document.getElementById("listaMovimientos");
  const recargarBtn = document.getElementById("recargarBtn");

  if (!saldoEl || !lista || !recargarBtn) {
    return;
  }

  const token = localStorage.getItem("token");

  if (!token) {
    window.location.replace("../login.html");
    return;
  }

  async function cargarWallet() {
    try {
      const res = await fetch(`${getServerUrl()}/api/wallet`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error("Error cargando wallet");

      const wallet = await res.json();

      saldoEl.textContent = wallet.saldo;
      renderMovimientos(wallet.movimientos || []);
    } catch (err) {
      console.error(err);
      saldoEl.textContent = "--";
      lista.innerHTML = "<li class='empty'>Error cargando movimientos</li>";
    }
  }

  function renderMovimientos(movs) {
    lista.innerHTML = "";

    if (!movs.length) {
      lista.innerHTML = "<li class='empty'>Sin movimientos</li>";
      return;
    }

    movs
      .slice()
      .reverse()
      .forEach((m) => {
        const li = document.createElement("li");
        li.className = m.tipo;

        let titulo = "Movimiento";
        if (m.tipo === "recarga_tel") titulo = "Recarga telefonica";
        if (m.tipo === "pago_viaje") titulo = "Viaje";

        li.innerHTML = `
          <div>
            <strong>${titulo}</strong>
            <span>${new Date(m.fecha).toLocaleString()}</span>
          </div>
          <b>${m.monto > 0 ? "+" : "-"}$${Math.abs(m.monto)}</b>
        `;

        lista.appendChild(li);
      });
  }

  recargarBtn.addEventListener("click", () => {
    location.href = "../paginas externos/recarga.html";
  });

  cargarWallet();
});
