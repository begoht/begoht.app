const footer = document.querySelector("footer");
const centerBtn = document.querySelector(".center-btn a");

export function setEstadoPasajero(estado) {

  footer.classList.remove("normal","buscando","encamino","viaje");

  switch(estado) {

    case "normal":
      footer.classList.add("normal");
      centerBtn.innerHTML = '<i class="fa-solid fa-car"></i>';
      break;

    case "buscando":
      footer.classList.add("buscando");
      centerBtn.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i>';
      break;

    case "encamino":
      footer.classList.add("encamino");
      centerBtn.innerHTML = '<i class="fa-solid fa-location-dot"></i>';
      break;

    case "viaje":
      footer.classList.add("viaje");
      centerBtn.innerHTML = '<i class="fa-solid fa-circle-stop"></i>';
      break;
  }
}
