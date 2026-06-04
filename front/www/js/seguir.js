const map = L.map("map").setView([18.55, -72.33], 13);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

let markerDriver, markerOrigen, markerDestino;
let driverPhone = "";
let lastDriverLatLng = null;

const GPS_HEADING_ACCEPT_DEG = 75;
const GPS_FLIP_GUARD_DEG = 135;
const HEADING_SMOOTHING = 0.58;
const MIN_HEADING_MOVE_METERS = 2;

async function cargarViaje() {
    try {
        const token = window.location.pathname.split("/").pop();
        const res = await fetch(`/api/pagos/seguir/${token}`);
        if (!res.ok) throw new Error("Link expirado o inválido");

        const { viaje } = await res.json();
        const motorista = viaje.motorista;
        driverPhone = motorista.telefono; // Asegúrate que tu modelo User tenga 'telefono'

        // Renderizar Info
        document.getElementById("driverNombre").innerText = motorista.nombre;
        document.getElementById("driverAuto").innerText = motorista.placa || "S/N";
        document.getElementById("driverFoto").src = motorista.foto || "/assets/default-user.png";

        // Marcadores
        if (viaje.origen) {
            markerOrigen = L.marker([viaje.origen.lat, viaje.origen.lng]).addTo(map).bindPopup("Recogida");
        }
        if (viaje.destino) {
            markerDestino = L.marker([viaje.destino.lat, viaje.destino.lng]).addTo(map).bindPopup("Destino");
        }
        if (motorista.ubicacion) {
            const motoIcon = L.icon({
                iconUrl: "/assets/icons/moto-transparent.svg?v=20260604-jacmel-gps",
                iconSize: [44, 44],
                iconAnchor: [22, 22],
                className: "bego-map-icon bego-map-icon-moto"
            });
            markerDriver = L.marker([motorista.ubicacion.lat, motorista.ubicacion.lng], { icon: motoIcon }).addTo(map);
            lastDriverLatLng = { lat: motorista.ubicacion.lat, lng: motorista.ubicacion.lng };
            map.setView([motorista.ubicacion.lat, motorista.ubicacion.lng], 15);
        }

        iniciarTracking(token);
    } catch (err) {
        alert(err.message);
    }
}

function iniciarTracking(token) {
    const socket = io(window.location.origin, {
        transports: ["websocket"],
        auth: { tracking: true }
    });

    socket.on("connect", () => {
        socket.emit("track:join", { token });
    });

    socket.on("track:posicion", pos => {
        if (!pos?.lat || !pos?.lng) return;

        const latLng = [pos.lat, pos.lng];
        const nextLatLng = { lat: pos.lat, lng: pos.lng };
        if (markerDriver) {
            markerDriver.setLatLng(latLng);
        } else {
            const motoIcon = L.icon({
                iconUrl: "/assets/icons/moto-transparent.svg?v=20260604-jacmel-gps",
                iconSize: [44, 44],
                iconAnchor: [22, 22],
                className: "bego-map-icon bego-map-icon-moto"
            });
            markerDriver = L.marker(latLng, { icon: motoIcon }).addTo(map);
        }

        const rumbo = seleccionarRumbo(pos.heading, calcularRumbo(lastDriverLatLng, nextLatLng));
        aplicarRumbo(markerDriver, rumbo.heading, rumbo.source);
        lastDriverLatLng = nextLatLng;
        map.panTo(latLng);
    });
}

function calcularRumbo(from, to) {
    if (!from || !to) return null;
    if (distanciaEntrePuntos(from, to) < MIN_HEADING_MOVE_METERS) return null;

    const toRad = value => value * Math.PI / 180;
    const toDeg = value => value * 180 / Math.PI;
    const lat1 = toRad(from.lat);
    const lat2 = toRad(to.lat);
    const dLng = toRad(to.lng - from.lng);
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) -
        Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function seleccionarRumbo(gpsHeading, movementHeading) {
    const gps = normalizarRumbo(gpsHeading);
    const movement = normalizarRumbo(movementHeading);

    if (movement != null) {
        if (gps != null && diferenciaRumbo(gps, movement) <= GPS_HEADING_ACCEPT_DEG) {
            return {
                heading: gps,
                source: "gps"
            };
        }

        return {
            heading: movement,
            source: "movement"
        };
    }

    return {
        heading: gps,
        source: gps == null ? null : "gps"
    };
}

function aplicarRumbo(marker, heading, source = null) {
    const numericHeading = normalizarRumbo(heading);

    if (!marker || numericHeading == null) return;

    const stableHeading = suavizarRumbo(marker, numericHeading, source);
    marker._begoHeading = stableHeading;

    requestAnimationFrame(() => {
        const element = marker.getElement?.();
        if (!element) return;
        const base = (element.style.transform || "")
            .replace(/(?:\s+)?rotate\([-0-9.]+deg\)/g, "")
            .trim();
        element.style.transformOrigin = "50% 50%";
        element.style.transform = `${base} rotate(${(stableHeading - 90).toFixed(1)}deg)`;
    });
}

function suavizarRumbo(marker, nextHeading, source) {
    const previous = normalizarRumbo(marker?._begoHeading);

    if (previous == null) return nextHeading;

    const delta = deltaRumbo(previous, nextHeading);

    if (source === "gps" && Math.abs(delta) > GPS_FLIP_GUARD_DEG) {
        return previous;
    }

    return normalizarRumbo(previous + delta * HEADING_SMOOTHING);
}

function normalizarRumbo(value) {
    const heading = Number(value);

    if (!Number.isFinite(heading) || heading < 0) return null;

    return ((heading % 360) + 360) % 360;
}

function deltaRumbo(from, to) {
    return ((to - from + 540) % 360) - 180;
}

function diferenciaRumbo(a, b) {
    return Math.abs(deltaRumbo(a, b));
}

function distanciaEntrePuntos(from, to) {
    if (!from || !to) return Infinity;

    const metrosLat = (from.lat - to.lat) * 111320;
    const metrosLng = (from.lng - to.lng) * 111320 * Math.cos((from.lat * Math.PI) / 180);
    return Math.sqrt(metrosLat * metrosLat + metrosLng * metrosLng);
}

// --- EVENTOS DE BOTONES ---

// 1. Compartir (Si el que lo ve quiere re-compartir)
document.getElementById("btnCompartirViaje").onclick = async () => {
    try {
        const url = window.location.href;
        if (navigator.share) {
            await navigator.share({ title: "Sigue mi viaje BeGO", url });
        } else {
            navigator.clipboard.writeText(url);
            alert("Link copiado al portapapeles");
        }
    } catch (e) { console.log(e); }
};

// 2. Llamar
document.getElementById("btnLlamarDriver").onclick = () => {
    if (driverPhone) window.location.href = `tel:${driverPhone}`;
};

// 3. WhatsApp
document.getElementById("btnWhatsDriver").onclick = () => {
    if (driverPhone) {
        const msg = encodeURIComponent("Hola, estoy siguiendo el viaje en BeGO.");
        window.open(`https://wa.me/${driverPhone}?text=${msg}`);
    }
};

// 4. Perfil
document.getElementById("btnVerPerfil").onclick = () => {
    alert("Próximamente: Calificaciones del motorista.");
};

cargarViaje();
