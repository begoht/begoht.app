const lista = document.getElementById("listaFamilia");
const btnAgregar = document.getElementById("btnAgregar");

let familia = JSON.parse(localStorage.getItem("familia")) || [];

function iconoPorTipo(tipo) {
  if (tipo === "nino") return "fa-baby";
  if (tipo === "mayor") return "fa-person-cane";
  return "fa-user";
}

function render() {
  lista.innerHTML = "";

  if (familia.length === 0) {
    lista.innerHTML = "<p>No hay familiares agregados.</p>";
    return;
  }

  familia.forEach((f, i) => {
    const div = document.createElement("div");
    div.className = "familia-card";
    div.innerHTML = `
      <div class="familia-header">
        <div class="familia-icon ${f.tipo}">
          <i class="fa-solid ${iconoPorTipo(f.tipo)}"></i>
        </div>
        <div>
          <h4>${f.nombre}</h4>
          <small>
            ${f.tipo === "nino" ? "Niño" : f.tipo === "mayor" ? "Adulto mayor" : "Adulto"} ·
            Límite: $${f.limite}
          </small>
        </div>
      </div>

      <button onclick="eliminar(${i})">Eliminar</button>
    `;
    lista.appendChild(div);
  });
}

btnAgregar.addEventListener("click", () => {
  const nombre = prompt("Nombre del familiar:");
  if (!nombre) return;

  const tipo = prompt(
    "Tipo: nino / adulto / mayor",
    "adulto"
  );

  const limite = prompt("Límite mensual:");
  if (!tipo || !limite) return;

  familia.push({ nombre, tipo, limite });
  localStorage.setItem("familia", JSON.stringify(familia));
  render();
});

window.eliminar = (i) => {
  if (!confirm("¿Eliminar familiar?")) return;
  familia.splice(i, 1);
  localStorage.setItem("familia", JSON.stringify(familia));
  render();
};

render();
