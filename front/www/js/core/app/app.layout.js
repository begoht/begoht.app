import { renderHeader } from "../../components/header.js";
import { renderFooter } from "../../components/footer.js";
import { actualizarBotonViaje } from "../../pasajero/ui/boton/botonViaje.ui.js?v=20260606-legal-trust";

export function renderLayout(route, viewHtml) {
    const header = document.getElementById("appHeader");
    const main = document.getElementById("appMain");
    const footer = document.getElementById("appFooter");

    if (header) header.innerHTML = renderHeader(route);
    if (main) main.innerHTML = viewHtml;
    if (footer) footer.innerHTML = renderFooter(route);

    setRouteClass(route);

    actualizarBotonViaje?.();
}

function setRouteClass(route) {
    document.body.classList.remove(
        "route-home",
        "route-servicios",
        "route-actividad",
        "route-cuenta"
    );

    const routesMap = {
        "/": "route-home",
        "/servicios": "route-servicios",
        "/actividad": "route-actividad",
        "/cuenta": "route-cuenta"
    };

    if (routesMap[route]) {
        document.body.classList.add(routesMap[route]);
    }
}
