import { getServerUrl } from "./conexion.js";

export function initRecarga() {
  let montoSeleccionado = 0;
  let saldoDisponible = 0;
  const API_URL = getServerUrl() + "/api";

  let token = localStorage.getItem("token") || localStorage.getItem("BeGO_token");
  if (!token) {
    location.hash = "#/login";
    return;
  }
  if (token.startsWith('"')) token = token.slice(1, -1);

  const form = document.getElementById("recargaForm");
  const saldoEl = document.getElementById("saldo");
  const numeroInput = document.getElementById("numero");
  const operadoraInput = document.getElementById("operadora");
  const montoManualInput = document.getElementById("montoManual");
  const btnRecargar = document.getElementById("recargarBtn");
  const overlay = document.getElementById("overlayProcesando");
  const msgEl = document.getElementById("recargaMsg");
  const summaryMonto = document.getElementById("summaryMonto");
  const summarySaldo = document.getElementById("summarySaldo");

  if (!form || !saldoEl || !numeroInput || !operadoraInput || !montoManualInput || !btnRecargar) return;

  const sonidoExito = new Audio(new URL("../assets/sounds/bego-success.wav", import.meta.url));
  sonidoExito.preload = "auto";

  const money = (value) => `HTG ${Number(value || 0).toLocaleString("fr-HT", { maximumFractionDigits: 2 })}`;

  function setMessage(text = "", type = "") {
    if (!msgEl) return;
    msgEl.textContent = text;
    msgEl.dataset.type = type;
  }

  function setLoading(isLoading) {
    btnRecargar.disabled = isLoading;
    btnRecargar.innerHTML = isLoading
      ? '<i class="fa-solid fa-spinner fa-spin"></i><span>Procesando</span>'
      : '<i class="fa-solid fa-bolt"></i><span>Recargar ahora</span>';
    overlay?.classList.toggle("hidden", !isLoading);
  }

  function updateSummary() {
    const saldoDespues = saldoDisponible - Number(montoSeleccionado || 0);
    if (summaryMonto) summaryMonto.textContent = money(montoSeleccionado);
    if (summarySaldo) {
      summarySaldo.textContent = money(saldoDespues);
      summarySaldo.classList.toggle("is-negative", saldoDespues < 0);
    }
  }

  async function cargarWallet() {
    try {
      const res = await fetch(`${API_URL}/wallet`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "true"
        }
      });
      const data = await res.json();
      saldoDisponible = Number(data.saldo || 0);
      saldoEl.textContent = money(saldoDisponible);
    } catch {
      saldoDisponible = 0;
      saldoEl.textContent = money(0);
    } finally {
      updateSummary();
    }
  }

  document.querySelectorAll(".operator-card").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".operator-card").forEach((item) => {
        item.classList.remove("active");
        item.setAttribute("aria-pressed", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-pressed", "true");
      operadoraInput.value = btn.dataset.operadora || "";
      setMessage("");
    });
  });

  document.querySelectorAll(".montos button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".montos button").forEach((item) => item.classList.remove("active"));
      btn.classList.add("active");
      montoSeleccionado = Number(btn.dataset.monto || 0);
      montoManualInput.value = "";
      setMessage("");
      updateSummary();
    });
  });

  montoManualInput.addEventListener("input", (event) => {
    montoSeleccionado = Number(event.target.value || 0);
    document.querySelectorAll(".montos button").forEach((item) => item.classList.remove("active"));
    setMessage("");
    updateSummary();
  });

  numeroInput.addEventListener("input", () => {
    const clean = numeroInput.value.replace(/[^\d\s+()-]/g, "");
    if (clean !== numeroInput.value) numeroInput.value = clean;
    setMessage("");
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const numero = numeroInput.value.replace(/[^\d]/g, "");
    const operadora = operadoraInput.value;
    const monto = Number(montoSeleccionado || 0);

    if (!/^\d{8,15}$/.test(numero)) {
      setMessage("Ingresa un numero valido.", "error");
      numeroInput.focus();
      return;
    }

    if (!operadora) {
      setMessage("Selecciona Digicel o Natcom.", "error");
      return;
    }

    if (!monto || monto < 10 || monto > 5000) {
      setMessage("El monto debe estar entre HTG 10 y HTG 5,000.", "error");
      montoManualInput.focus();
      return;
    }

    if (saldoDisponible - monto < 0) {
      setMessage("Saldo insuficiente en tu Wallet BeGO.", "error");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/recargas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "true"
        },
        body: JSON.stringify({ numero, operadora, monto })
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.msg || "Error en recarga");
      }

      saldoDisponible = Number(data.nuevoSaldo || saldoDisponible - monto);
      saldoEl.textContent = money(saldoDisponible);
      updateSummary();

      await sonidoExito.play().catch(() => {});

      localStorage.setItem("reciboRecarga", JSON.stringify(data.recarga));
      location.hash = "#/recibo-recarga";
    } catch (error) {
      setMessage(error.message || "Error de conexion.", "error");
    } finally {
      setLoading(false);
    }
  });

  cargarWallet();
}
