export function initRating(data) {
  let ratingSeleccionado = 0;

  const modal = document.getElementById("modalRating");
  const estrellas = document.querySelectorAll(".estrellas i");
  const btnCalificar = document.querySelector(".detalle-acciones .btn-primario");
  const btnEnviar = document.getElementById("btnEnviarRating");
  const btnCerrar = document.getElementById("cerrarRating");
  const btnRepetir = document.querySelector(".btn-secundario");

  if (!modal) return;

  // 🟢 ocultar si ya calificó
  if (data.rating) {
    btnCalificar?.remove();
  }

  // 🟢 abrir modal
  btnCalificar?.addEventListener("click", () => {
    modal.classList.remove("hidden");
  });

  // 🟢 cerrar modal
  btnCerrar?.addEventListener("click", () => {
    modal.classList.add("hidden");
  });

  // 🟢 estrellas
  estrellas.forEach((estrella) => {
    estrella.addEventListener("click", () => {
      ratingSeleccionado = Number(estrella.dataset.value);

      estrellas.forEach((e) => {
        e.classList.toggle("activa", e.dataset.value <= ratingSeleccionado);
      });
    });
  });

  // 🟢 enviar rating
  btnEnviar?.addEventListener("click", () => {
    if (!ratingSeleccionado) {
      alert("Selecciona una calificación");
      return;
    }

    const comentario = document.getElementById("comentario").value;

    console.log("⭐ Rating enviado:", {
      viajeId: data._id,
      rating: ratingSeleccionado,
      comentario,
    });

    modal.classList.add("hidden");
  });

  // 🟢 repetir viaje
  btnRepetir?.addEventListener("click", () => {
    localStorage.setItem("origen", JSON.stringify(data.origen));
    localStorage.setItem("destino", JSON.stringify(data.destino));

    location.hash = "#/";
  });
}