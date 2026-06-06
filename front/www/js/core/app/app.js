import { AppState } from "./app.state.js";
import { getSocket } from "../../socket/socket.js?v=20260606-monitoring";
import { createMap } from "../../map/map.singleton.js";
import { initRouter } from "../router/router.js?v=20260605-price-premium-cancel";
import { initLaunchCountdown } from "../../launch-countdown.js?v=20260604-cordoba-map-test";

function mostrarAppLista() {
    document.body.classList.add("app-ready");
    window.setTimeout(() => {
        document.getElementById("appBootSplash")?.remove();
    }, 320);
}

export async function initApp() {
    console.log("🚀 App iniciada");

    await initLaunchCountdown();

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
