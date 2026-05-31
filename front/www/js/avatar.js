/*************************************************
 * AVATAR – SPA READY
 *************************************************/
export function initAvatar() {
  const img = document.getElementById("fotoPerfil");
  const input = document.getElementById("inputFoto");

  if (!img || !input || img.dataset.bound) return;

  img.dataset.bound = "true";

  const fotoGuardada = localStorage.getItem("BeGO_avatar");
  if (fotoGuardada) {
    img.src = fotoGuardada;
  }

  img.onclick = () => input.click();

  input.onchange = () => {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      img.src = reader.result;
      localStorage.setItem("BeGO_avatar", reader.result);
    };
    reader.readAsDataURL(file);
  };
}