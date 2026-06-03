import { safe } from "../features/shared/safe.js";
import { safeImport } from "../features/shared/import.js";
import { initModo } from "../../modo.js";
import { initWalletUI } from "../../wallet.js";
import { initLogout } from "../../logout.js";
import { initHeader } from "../../components/header.init.js?v=20260601-huella-user";
import { getMap } from "../../map/map.singleton.js";
import { restoreViajeUI } from "./app.restore.js?v=20260603-road-heading";
import { viajeState } from "../../viaje/viaje.state.js";

let currentInitId = 0;

export async function runPageInit() {

    const initId = ++currentInitId;

    await restoreViajeUI();
    await new Promise(requestAnimationFrame);

    await restoreViajeUI();

    if (initId !== currentInitId) return;

    safe(initModo);
    safe(initWalletUI);
    safe(initLogout);
    safe(initHeader);

    const isHome =
        location.hash === "#/" ||
        location.hash === "" ||
        location.hash === "#";

    toggleMap(isHome);

    if (isHome) {
        await initHome(initId);
        if (viajeState.activo) {
            await restoreViajeUI();
        }
        return;
    }



    if (document.body.classList.contains("route-cuenta")) {
        await safeImport(initId, "../user.js", "initUserUI");
    }
}

function toggleMap(isHome) {
    const mapEl = document.getElementById("map");
    if (mapEl) {
        mapEl.style.display = isHome ? "block" : "none";
    }
}

async function initHome(initId) {
    const map = getMap();
    if (!map) return;

    const { initPasajero } = await import("../../pasajero/pasajero.main.js?v=20260603-road-heading");

    if (initId !== currentInitId) return;

    initPasajero?.(map);

    setTimeout(() => map.invalidateSize(), 100);
}
