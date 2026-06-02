import { AppState } from "./app.state.js";
import { getSocket } from "../../socket/socket.js";
import { createMap } from "../../map/map.singleton.js";
import { initRouter } from "../router/router.js?v=20260601-finalizado-social";

function mostrarAppLista() {
    document.body.classList.add("app-ready");
    window.setTimeout(() => {
        document.getElementById("appBootSplash")?.remove();
    }, 320);
}

export function initApp() {
    console.log("🚀 App iniciada");

    AppState.socket = getSocket();
    if (!AppState.socket) return;

    const mapEl = document.getElementById("map");

    if (mapEl) {
        const map = createMap(mapEl);

        requestAnimationFrame(() => {
            map.invalidateSize();
        });
    }

    initRouter();
    requestAnimationFrame(mostrarAppLista);
}
