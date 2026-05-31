// www/js/modules/sidebar.js
export function initSidebar() {
  window.toggleMenu = function () {
    document.getElementById("sidebar")?.classList.toggle("active");
    document.getElementById("backdrop")?.classList.toggle("active");
  };
}
