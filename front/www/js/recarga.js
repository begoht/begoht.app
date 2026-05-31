import { getServerUrl } from "./conexion.js";

export function initRecarga() {

  let montoSeleccionado = 0;
  const API_URL = getServerUrl() + "/api";

  let token = localStorage.getItem("token");
  if (!token) return location.hash = "#/login";
  if (token.startsWith('"')) token = token.slice(1, -1);

  const saldoEl = document.getElementById("saldo");
  const numeroInput = document.getElementById("numero");
  const operadoraSelect = document.getElementById("operadora");
  const montoManualInput = document.getElementById("montoManual");
  const btnRecargar = document.getElementById("recargarBtn");
  const overlay = document.getElementById("overlayProcesando");

  const sonidoExito = new Audio("/sounds/success.mp3");

  function generarFirmaBeGO() {
    const userId = JSON.parse(atob(token.split(".")[1])).id;
    return `GM-${userId.slice(-6)}-${Date.now()}-${Math.random().toString(36).substring(2,8)}`.toUpperCase();
  }

  async function cargarWallet() {
    try {
      const userId = JSON.parse(atob(token.split(".")[1])).id;
      const res = await fetch(`${API_URL}/wallet`, {
        headers: { 
          "Authorization": `Bearer ${token}`,
          "ngrok-skip-browser-warning": "true" // Importante si usas túneles
        }
      });
      const data = await res.json();
      saldoEl.textContent = "HTG " + data.saldo;
    } catch {
      saldoEl.textContent = "HTG 0";
    }
  }

  cargarWallet();

  document.querySelectorAll(".montos button").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".montos button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      montoSeleccionado = Number(btn.dataset.monto);
      montoManualInput.value = "";
    });
  });

  montoManualInput.addEventListener("input", e => {
    montoSeleccionado = Number(e.target.value);
    document.querySelectorAll(".montos button").forEach(b => b.classList.remove("active"));
  });

  btnRecargar.addEventListener("click", async () => {

    const numero = numeroInput.value.trim();
    const operadora = operadoraSelect.value;
    const monto = montoSeleccionado;

    if (!numero || !operadora || !monto || monto <= 0) {
      alert("Completa correctamente todos los datos");
      return;
    }

    const firma = generarFirmaBeGO();
    overlay.classList.remove("hidden");

    try {
      const res = await fetch(`${API_URL}/recargas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token
        },
        body: JSON.stringify({ numero, operadora, monto, firmaBeGO: firma })
      });

      const data = await res.json();

      setTimeout(() => {
        overlay.classList.add("hidden");

        if (data.ok) {
          sonidoExito.play();

          data.recarga.firmaBeGO = firma;
          localStorage.setItem("reciboRecarga", JSON.stringify(data.recarga));

          // 🔥 SPA NAV
          location.hash = "#/recibo-recarga";

        } else {
          alert(data.msg || "Error en recarga");
        }

      }, 1500);

    } catch {
      overlay.classList.add("hidden");
      alert("Error de conexión");
    }

  });

}