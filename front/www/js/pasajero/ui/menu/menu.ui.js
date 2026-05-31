/*************************************************
 * 🍔 MENÚ LATERAL
 *************************************************/
export function initToggleMenuDriver() {
    const menuBtn = document.getElementById("menuBtn"); 
    const sidebar = document.getElementById("sidebar"); 

    if (menuBtn && sidebar) {
        menuBtn.addEventListener("click", () => {
            sidebar.classList.toggle("active");
        });
    }
}