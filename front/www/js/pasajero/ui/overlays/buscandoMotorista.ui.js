import { getSocket } from "../../../socket/socket.js?v=20260606-session-refresh";
import { viajeState } from "../../../viaje/viaje.state.js";
import { actualizarBotonViaje } from "../boton/botonViaje.ui.js?v=20260606-payment-methods";

export function mostrarBuscandoMotorista(force = false) {
  if (!force && !viajeState.precioConfirmado) {
    return;
  }

  cerrarBuscandoMotorista();

  const modal = document.createElement("div");
  modal.id = "buscandoMotorista";

  modal.innerHTML = `
<div class="busqueda-shell">
<div id="boxBusqueda" class="busqueda-card">

<div class="top-glow"></div>

<div class="busqueda-status">

<div class="spinner-wrapper">
<div class="spinner-ring"></div>
<div class="spinner-core">🏍️</div>
</div>

<div class="status-content">
<h3>Buscando conductor</h3>

<p id="textoBusqueda">
Estamos notificando motoristas cercanos
</p>

<div class="search-dots">
<span></span>
<span></span>
<span></span>
</div>
</div>

</div>

<div class="busqueda-meta">

<div class="meta-item">
<small>Tiempo</small>
<span id="contadorBusqueda">00:00</span>
</div>

<div class="meta-divider"></div>

<div class="meta-item align-right">
<small>Estado</small>
<span id="motoristaCandidato">
Esperando respuesta
</span>
</div>

</div>

<button id="cancelarBusqueda">
Cancelar búsqueda
</button>

</div>
</div>

<style>

#buscandoMotorista .busqueda-shell{
  position:fixed;
  left:0;
  right:0;
  bottom:85px;
  z-index:99999;
  display:flex;
  justify-content:center;
  padding:0 16px;
  pointer-events:none;
}

#buscandoMotorista .busqueda-card{
  position:relative;
  overflow:hidden;
  
  width:min(430px,100%);
  
  background:
  linear-gradient(
    135deg,
    rgba(15,23,42,0.94),
    rgba(30,41,59,0.92)
  );
  
  backdrop-filter:blur(20px);
  -webkit-backdrop-filter:blur(20px);
  
  border:
  1px solid rgba(255,255,255,0.08);
  
  border-radius:28px;
  
  padding:18px;
  
  box-shadow:
  0 10px 40px rgba(0,0,0,0.45),
  0 0 0 1px rgba(255,255,255,0.04) inset,
  0 0 40px rgba(34,197,94,0.08);
  
  pointer-events:auto;
  
  animation:
  cardEntrance .35s ease;
}

.top-glow{
  position:absolute;
  top:-80px;
  left:50%;
  transform:translateX(-50%);
  width:220px;
  height:220px;
  
  background:
  radial-gradient(
    circle,
    rgba(34,197,94,0.25),
    transparent 70%
  );
  
  pointer-events:none;
}

.busqueda-status{
  display:flex;
  align-items:center;
  gap:16px;
}

.spinner-wrapper{
  position:relative;
  width:68px;
  height:68px;
  flex:0 0 auto;
}

.spinner-ring{
  position:absolute;
  inset:0;
  
  border-radius:50%;
  
  border:4px solid rgba(255,255,255,0.08);
  border-top:4px solid #22c55e;
  
  animation:
  spinRing 1s linear infinite;
}

.spinner-core{
  position:absolute;
  inset:10px;
  
  border-radius:50%;
  
  display:flex;
  align-items:center;
  justify-content:center;
  
  background:
  radial-gradient(
    circle at top,
    #22c55e,
    #15803d
  );
  
  font-size:26px;
  
  box-shadow:
  0 0 20px rgba(34,197,94,0.45);
  
  animation:
  pulseCore 2s infinite;
}

.status-content{
  flex:1;
}

#buscandoMotorista h3{
  margin:0;
  color:white;
  font-size:1.08rem;
  font-weight:800;
  letter-spacing:-0.3px;
}

#buscandoMotorista p{
  margin:5px 0 8px;
  color:#94a3b8;
  font-size:13px;
  line-height:1.4;
}

.search-dots{
  display:flex;
  gap:6px;
}

.search-dots span{
  width:7px;
  height:7px;
  border-radius:50%;
  background:#22c55e;
  
  animation:
  dotPulse 1.4s infinite ease-in-out;
}

.search-dots span:nth-child(2){
  animation-delay:.2s;
}

.search-dots span:nth-child(3){
  animation-delay:.4s;
}

.busqueda-meta{
  margin-top:18px;
  
  display:flex;
  align-items:center;
  justify-content:space-between;
  
  padding:14px;
  
  background:
  rgba(255,255,255,0.05);
  
  border:
  1px solid rgba(255,255,255,0.05);
  
  border-radius:18px;
}

.meta-item{
  display:flex;
  flex-direction:column;
  gap:3px;
}

.meta-item small{
  color:#64748b;
  font-size:11px;
  text-transform:uppercase;
  letter-spacing:.5px;
}

#contadorBusqueda{
  color:#22c55e;
  font-weight:800;
  font-size:17px;
  font-family:monospace;
}

#motoristaCandidato{
  color:white;
  font-size:13px;
  font-weight:600;
  
  max-width:150px;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}

.align-right{
  align-items:flex-end;
}

.meta-divider{
  width:1px;
  align-self:stretch;
  background:rgba(255,255,255,0.08);
}

#cancelarBusqueda{
  margin-top:16px;
  width:100%;
  border:none;
  
  padding:14px;
  
  border-radius:16px;
  
  background:
  linear-gradient(
    135deg,
    #ef4444,
    #dc2626
  );
  
  color:white;
  font-weight:800;
  font-size:15px;
  
  cursor:pointer;
  
  transition:
  transform .2s,
  opacity .2s,
  box-shadow .2s;
  
  box-shadow:
  0 10px 25px rgba(239,68,68,0.25);
}

#cancelarBusqueda:hover{
  transform:translateY(-1px);
}

#cancelarBusqueda:active{
  transform:scale(.98);
  opacity:.9;
}

@keyframes spinRing{
  to{
    transform:rotate(360deg);
  }
}

@keyframes pulseCore{
  0%,100%{
    transform:scale(1);
  }
  50%{
    transform:scale(1.06);
  }
}

@keyframes dotPulse{
  0%,80%,100%{
    opacity:.3;
    transform:scale(.7);
  }
  40%{
    opacity:1;
    transform:scale(1);
  }
}

@keyframes cardEntrance{
  from{
    opacity:0;
    transform:
    translateY(18px)
    scale(.96);
  }
  to{
    opacity:1;
    transform:
    translateY(0)
    scale(1);
  }
}

</style>
`;

  document.body.appendChild(modal);

  const mapEl = document.getElementById("map");
  if (mapEl) {
    mapEl.classList.remove("hidden");
    mapEl.style.display = "block";
    setTimeout(() => window.map?.invalidateSize?.(), 120);
  }

  viajeState.buscando = true;
  actualizarBotonViaje();

  let segundos = 0;
  modal.intervaloTiempo = setInterval(() => {
    segundos++;
    const min = String(Math.floor(segundos / 60)).padStart(2, "0");
    const sec = String(segundos % 60).padStart(2, "0");
    const el = modal.querySelector("#contadorBusqueda");
    if (el) el.textContent = `${min}:${sec}`;
  }, 1000);

  modal.querySelector("#cancelarBusqueda").onclick = (event) => {
    const btn = event.currentTarget;
    if (btn?.dataset.cancelando === "true") return;
    if (btn) {
      btn.dataset.cancelando = "true";
      btn.disabled = true;
      btn.textContent = "Annulation...";
    }

    const socket = getSocket();
    if (viajeState.viajeId && socket) {
      socket.emit("cancelar-viaje", { viajeId: viajeState.viajeId });
    }

    Object.assign(viajeState, {
      activo: false,
      buscando: false,
      asignado: false,
      enCurso: false,
      llego: false,
      cancelado: false,
      precioConfirmado: false,
      viajeId: null,
      motorista: null,
      proximoDestino: null,
      estado: null
    });

    localStorage.removeItem("viajeActivo");
    sessionStorage.removeItem("viajeActivo");

    cerrarBuscandoMotorista();
    actualizarBotonViaje();
  };
}

export function cerrarBuscandoMotorista() {
  const modal = document.getElementById("buscandoMotorista");
  if (!modal) return;
  if (modal.intervaloTiempo) clearInterval(modal.intervaloTiempo);
  modal.remove();
}

export function actualizarMotoristaCandidato(motorista = {}) {
  const modal = document.getElementById("buscandoMotorista");
  if (!modal) return;

  const texto = modal.querySelector("#textoBusqueda");
  const candidato = modal.querySelector("#motoristaCandidato");
  const box = modal.querySelector("#boxBusqueda");
  
  const nombre = motorista.nombre || "Motorista cercano";

  if (texto) {
    texto.textContent =
    "Motorista encontrado • verificando disponibilidad";
  }
  
  if (candidato) {
    candidato.textContent =
    `🚖 ${nombre}`;
  }
  
  if (box) {
    box.animate(
      [
        {
          transform: "scale(1)",
          boxShadow: "0 0 0 rgba(34,197,94,0)"
        },
        {
          transform: "scale(1.02)",
          boxShadow: "0 0 40px rgba(34,197,94,0.25)"
        },
        {
          transform: "scale(1)"
        }
      ],
      {
        duration: 650,
        easing: "ease-out"
      }
    );
  }
}
