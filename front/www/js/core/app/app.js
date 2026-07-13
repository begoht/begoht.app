import { AppState } from "./app.state.js";
import { getSocket } from "../../socket/socket.js?v=20260713-passenger-connection-hotfix";
import { createMap } from "../../map/map.singleton.js?v=20260702-visible-labels";
import { initRouter } from "../router/router.js?v=20260713-passenger-connection-hotfix";
import { initLaunchCountdown } from "../../launch-countdown.js?v=20260624-cordoba-gps";
import { initNotifications } from "../../notifications/notifications.js?v=20260629-news-push";

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
    initNotifications(AppState.socket);

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
