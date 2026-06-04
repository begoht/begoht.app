function pagar(metodo) {
  if (["moncash", "natcash"].includes(metodo)) {
    const nombre = metodo === "moncash" ? "MonCash" : "NatCash";
    alert(`${nombre} no esta disponible por ahora.`);
    return;
  }

  const monto = Number(prompt("Monto a pagar"));
  if (!monto || monto <= 0) return;

  const user = JSON.parse(localStorage.getItem("BeGO_user"));

  const pago = {
    id: "pay_" + Date.now(),
    metodo,
    monto,
    estado: "pendiente",
    referencia: null,
    fecha: new Date().toLocaleString()
  };

  // SIMULACIÓN DE PROCESO
  setTimeout(() => {
    pago.estado = "exitoso";
    pago.referencia = metodo.toUpperCase() + "-" + Math.floor(Math.random() * 999999);

    // Actualizar billetera
    user.saldo += monto;
    user.billetera.movimientos.push({
      tipo: "recarga",
      monto,
      metodo,
      referencia: pago.referencia,
      fecha: pago.fecha
    });

    localStorage.setItem("BeGO_user", JSON.stringify(user));

    mostrarConfirmacion(pago);
  }, 1200);
}

// MOSTRAR MODAL
function mostrarConfirmacion(pago) {
  document.getElementById("metodoPago").textContent = pago.metodo.toUpperCase();
  document.getElementById("montoPago").textContent = "$" + pago.monto;
  document.getElementById("refPago").textContent = pago.referencia;

  document.getElementById("modalPago").classList.remove("oculto");
}

// CERRAR MODAL
function cerrarModal() {
  document.getElementById("modalPago").classList.add("oculto");
  history.back();
}
