export function initRating(data) {
  let ratingSeleccionado = 0;

  const modal = document.getElementById("modalRating");
  const estrellas = document.querySelectorAll(".estrellas i");
  const btnCalificar = document.getElementById("btnCalificarViaje") || document.querySelector(".detalle-acciones .btn-primario");
  const btnEnviar = document.getElementById("btnEnviarRating");
  const btnCerrar = document.getElementById("cerrarRating");
  const btnRepetir = document.getElementById("btnRepetirViaje") || document.querySelector(".btn-secundario");

  if (!modal) return;

  if (data.rating) {
    btnCalificar?.remove();
  }

  btnCalificar?.addEventListener("click", () => {
    modal.classList.remove("hidden");
  });

  btnCerrar?.addEventListener("click", () => {
    modal.classList.add("hidden");
  });

  modal.addEventListener("click", (event) => {
    if (event.target === modal) modal.classList.add("hidden");
  });

  estrellas.forEach((estrella) => {
    estrella.addEventListener("click", () => {
      ratingSeleccionado = Number(estrella.dataset.value);

      estrellas.forEach((item) => {
        item.classList.toggle("activa", Number(item.dataset.value) <= ratingSeleccionado);
      });
    });
  });

  btnEnviar?.addEventListener("click", () => {
    if (!ratingSeleccionado) {
      alert("Selectionnez une note");
      return;
    }

    const comentario = document.getElementById("comentario")?.value || "";

    console.log("Rating BeGO:", {
      viajeId: data._id,
      rating: ratingSeleccionado,
      comentario,
    });

    modal.classList.add("hidden");
  });

  btnRepetir?.addEventListener("click", () => {
    if (data.origen) localStorage.setItem("origen", JSON.stringify(data.origen));
    if (data.destino) localStorage.setItem("destino", JSON.stringify(data.destino));
    location.hash = "#/";
  });
}
