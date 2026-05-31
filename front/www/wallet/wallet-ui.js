/*************************************************
 * 🎨 WALLET UI
 *************************************************/

export function inicializarVisibilidad() {
    const toggleBtn = document.querySelector('.toggle-visibility');
    const saldoEl = document.getElementById("saldoWallet");
    let saldoVisible = false;

    if (!toggleBtn || !saldoEl) return;

    saldoEl.textContent = "***.***.***";
    toggleBtn.innerHTML = '<i class="fa-regular fa-eye-slash"></i>';

    toggleBtn.addEventListener('click', () => {
        saldoVisible = !saldoVisible;
        const saldoReal = parseFloat(saldoEl.dataset.real || 0);

        if (saldoVisible) {
            saldoEl.textContent = saldoReal.toLocaleString('es-AR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
            toggleBtn.innerHTML = '<i class="fa-regular fa-eye"></i>';
        } else {
            saldoEl.textContent = "***.***.***";
            toggleBtn.innerHTML = '<i class="fa-regular fa-eye-slash"></i>';
        }
    });
}

export function actualizarSaldo(saldo) {
    const saldoEl = document.getElementById("saldoWallet");
    if (!saldoEl) return;

    saldoEl.dataset.real = saldo;

    if (!saldoEl.textContent.includes("*")) {
        saldoEl.textContent = saldo.toLocaleString('es-AR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }
}

export function renderHistorial(movimientos) {
    const lista = document.getElementById("listaMovimientos");
    if (!lista) return;

    lista.innerHTML = "";

    if (!movimientos || movimientos.length === 0) {
        lista.innerHTML = "<div class='service-item'>No hay movimientos aún</div>";
        return;
    }

    movimientos.reverse().forEach(m => {
        const esIngreso = m.monto >= 0;

        const div = document.createElement("div");
        div.className = "service-item";

        div.innerHTML = `
            <div class="service-icon">
                <i class="fa-solid ${esIngreso ? 'fa-arrow-down' : 'fa-arrow-up'}"
                   style="color: ${esIngreso ? '#22c55e' : '#ef4444'};"></i>
            </div>
            <div class="service-info">
                <h3>${(m.tipo || "Movimiento").replace(/_/g, " ")}</h3>
                <small>${new Date(m.fecha).toLocaleDateString()}</small>
            </div>
            <div style="margin-left:auto;">
                <strong style="color:${esIngreso ? '#22c55e' : '#f8fafc'};">
                    ${esIngreso ? '+' : ''}${m.monto.toFixed(2)}
                </strong>
            </div>
        `;

        lista.appendChild(div);
    });
}