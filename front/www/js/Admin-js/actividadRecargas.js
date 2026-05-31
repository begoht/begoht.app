let token = localStorage.getItem("token");
if (token && token.startsWith('"')) token = token.slice(1, -1);

// Detectar backend correcto
let API = "";

if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
  API = "http://localhost:3000/api";
} else if (location.hostname === "10.0.2.2") {
  API = "https://bego.com.ht/api";
} else {
  API = `${window.location.origin}/api`;
}

// ==============================
// CARGAR RECARGAS
// ==============================
async function cargarRecargas() {
  try {
    const res = await fetch(`${API}/recargas`, {
      headers: {
        Authorization: "Bearer " + token
      }
    });

    const recargas = await res.json();
    const contenedor = document.getElementById("listaRecargas");

    if (!recargas.length) {
      contenedor.innerHTML = "<p class='vacio'>No hay recargas aún</p>";
      return;
    }

    contenedor.innerHTML = "";

    recargas.forEach(r => {
      const fecha = new Date(r.fecha).toLocaleString();

      const div = document.createElement("div");
      div.className = "recarga-item";

      div.innerHTML = `
        <div>
          <strong>${r.operadora.toUpperCase()}</strong>
          <p>${r.numero}</p>
          <small>${fecha}</small>
        </div>

        <div class="monto">
          - HTG ${r.monto}
        </div>

        <button class="btn-wsp">
          <i class="fa-brands fa-whatsapp"></i>
        </button>
      `;

      div.querySelector(".btn-wsp").addEventListener("click", () => {
        enviarWhatsApp(r);
      });

      contenedor.appendChild(div);
    });

  } catch (err) {
    console.error("Error cargando recargas", err);
  }
}

// ==============================
// ENVIAR A WHATSAPP
// ==============================
function enviarWhatsApp(r) {
  const fecha = new Date(r.fecha).toLocaleString();

  const mensaje = `
🧾 *BeGO – Recibo de Recarga*

📱 Número: ${r.numero}
📡 Operadora: ${r.operadora}
💰 Monto: HTG ${r.monto}
🗓 Fecha: ${fecha}
✅ Estado: ${r.estado || "Completada"}
firmaBeGO: ${r.firmaBeGO}

Gracias por usar BeGO
`;

  const url = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
  window.open(url, "_blank");
}

document.addEventListener("DOMContentLoaded", cargarRecargas);
