import { AppState } from "./app.state.js";
import { getSocket } from "../../socket/socket.js";
import { createMap } from "../../map/map.singleton.js";
import { initRouter } from "../router/router.js?v=20260601-saved-destinations";

export function initApp() {
    console.log("🚀 App iniciada");

    AppState.socket = getSocket();

    const mapEl = document.getElementById("map");

    if (mapEl) {
        const map = createMap(mapEl);

        requestAnimationFrame(() => {
            map.invalidateSize();
        });
    }

    initRouter();
}
