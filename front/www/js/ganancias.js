export function initGanancias() {

  const btnMotorista = document.getElementById("btnMotorista");

  btnMotorista?.addEventListener("click", () => {
    const user = JSON.parse(localStorage.getItem("BeGO_user"));

    if (!user) {
      return window.location.hash = "#/login";
    }

    localStorage.setItem("quiero_ser_motorista", "true");

    // 🔥 USAR ROUTER (NO window.location)
    window.location.hash = "#/registro-motorista";
  });

}