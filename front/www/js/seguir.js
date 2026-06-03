const map = L.map("map").setView([18.55, -72.33], 13);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

let markerDriver, markerOrigen, markerDestino;
let driverPhone = "";

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
                iconUrl: "/assets/icons/moto-transparent.svg?v=20260603-transparent-icons",
                iconSize: [44, 44],
                iconAnchor: [22, 22],
                className: "bego-map-icon bego-map-icon-moto"
            });
            markerDriver = L.marker([motorista.ubicacion.lat, motorista.ubicacion.lng], { icon: motoIcon }).addTo(map);
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
        if (markerDriver) {
            markerDriver.setLatLng(latLng);
        } else {
            const motoIcon = L.icon({
                iconUrl: "/assets/icons/moto-transparent.svg?v=20260603-transparent-icons",
                iconSize: [44, 44],
                iconAnchor: [22, 22],
                className: "bego-map-icon bego-map-icon-moto"
            });
            markerDriver = L.marker(latLng, { icon: motoIcon }).addTo(map);
        }

        map.panTo(latLng);
    });
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
