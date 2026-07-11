export function normalizarFotoUrl(value = "") {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (/^(?:https?:|data:|blob:)/i.test(raw)) return raw;

    const base = typeof window.getServerUrl === "function"
        ? window.getServerUrl()
        : window.location.origin;

    try {
        return new URL(raw, base).href;
    } catch {
        return raw;
    }
}

export function obtenerFotoPerfil(entity = {}, fallback = "") {
    return normalizarFotoUrl(
        entity?.foto ||
        entity?.avatar ||
        entity?.photo ||
        entity?.profilePhoto ||
        entity?.profileImage ||
        entity?.imagen ||
        fallback ||
        ""
    );
}

export function obtenerNombrePasajero(pasajero = {}, viaje = {}) {
    const pasajeroObj = typeof pasajero === "object" && pasajero !== null ? pasajero : {};
    const fullName =
        pasajeroObj.fullName ||
        pasajeroObj.nombreCompleto ||
        pasajeroObj.displayName ||
        pasajeroObj.name ||
        viaje.pasajeroNombreCompleto ||
        viaje.pasajeroNombre ||
        viaje.nombrePasajero ||
        viaje.clienteNombre ||
        viaje.usuarioNombre;
    if (fullName) return String(fullName).trim();

    const parts = [
        pasajeroObj.nombre || pasajeroObj.firstName || viaje.pasajero?.nombre || viaje.usuario?.nombre || viaje.cliente?.nombre,
        pasajeroObj.apellido || pasajeroObj.lastName || viaje.pasajero?.apellido || viaje.usuario?.apellido || viaje.cliente?.apellido
    ].filter(Boolean);

    return parts.join(" ").trim() || "Pasajero";
}

export function limpiarDireccionPrincipal(address = "") {
    return String(address || "Direccion").split(",")[0].trim() || "Direccion";
}

export function limpiarDireccionDetalle(address = "", fallback = "") {
    const parts = String(address || "").split(",").slice(1).map(part => part.trim()).filter(Boolean);
    return parts.join(", ") || fallback || "Detalle pendiente";
}

export function obtenerServicioLabel(viaje = {}) {
    if (viaje.tipo === "envio") return "Envio";
    if (viaje.tipoServicio) return String(viaje.tipoServicio);
    return "Estandar";
}

export function formatearMetodoPago(method = "") {
    const value = String(method || "efectivo").toLowerCase();
    if (value.includes("cash") || value.includes("efect")) return "Efectivo";
    if (value.includes("wallet")) return "Wallet";
    if (value.includes("card") || value.includes("tarjeta")) return "Tarjeta";
    return method || "Efectivo";
}

export function normalizarEstadoVisual(estado) {
    const estados = {
        asignado: "aceptado",
        llego: "esperando",
        en_curso: "en_viaje",
        completado: "finalizado"
    };

    return estados[estado] || estado;
}

export function obtenerEtapaLabel(viaje, estado) {
    if (estado === "llego") return "Attente";
    if (estado === "en_curso") return viaje?.idaVuelta?.estado === "retorno_en_curso" ? "Retour" : "Destination";
    if (["completado", "finalizado"].includes(estado)) return "Resume";
    return "Pickup";
}

export function obtenerEtaLabel(viaje, estado, distanceLabel) {
    if (estado === "llego") return { valor: "00:00", label: "espera" };

    const raw = estado === "en_curso"
        ? (viaje?.etaDestino ?? viaje?.etaMinutosDestino ?? viaje?.eta ?? viaje?.duracionMin ?? viaje?.tiempoEstimadoMin)
        : (viaje?.etaPasajero ?? viaje?.etaOrigen ?? viaje?.etaMinutosOrigen ?? viaje?.etaMinutos);
    const minutes = Number(raw);
    if (Number.isFinite(minutes) && minutes > 0) {
        return { valor: `${Math.round(minutes)} min`, label: "ETA" };
    }

    const meters = obtenerMetrosDesdeLabel(distanceLabel);
    if (Number.isFinite(meters) && meters > 0) {
        return { valor: `${calcularEtaMinutos(meters)} min`, label: "ETA" };
    }

    return { valor: "--", label: "ETA" };
}

export function obtenerDistanciaLabel(viaje, estado, target, driverPosition = null) {
    if (estado === "llego") return "0 m";

    const directa = estado === "en_curso"
        ? (viaje?.distanciaDestino || viaje?.distanciaKmDestino || viaje?.distanciaKm || viaje?.distancia)
        : (viaje?.distanciaPasajero || viaje?.distanciaOrigen || viaje?.distanciaKmOrigen);
    const directaLabel = formatearDistanciaValor(directa);
    if (directaLabel) return directaLabel;

    const from = normalizarCoord(driverPosition);
    const to = normalizarCoord(target);
    if (from && to) {
        const metros = calcularDistanciaMetros(from, to);
        return metros < 1000 ? `${Math.round(metros)} m` : `${(metros / 1000).toFixed(1)} km`;
    }

    return "--";
}

export function obtenerMetrosDesdeLabel(label = "") {
    const text = String(label || "").replace(",", ".");
    const value = Number(text.match(/[\d.]+/)?.[0]);
    if (!Number.isFinite(value)) return null;
    if (/km/i.test(text)) return value * 1000;
    if (/\bm\b/i.test(text)) return value;
    return null;
}

export function calcularEtaMinutos(metros) {
    const velocidadMps = (30 * 1000) / 3600;
    return Math.max(1, Math.ceil(metros / velocidadMps / 60));
}

export function formatearDistanciaValor(valor) {
    if (valor === null || valor === undefined || valor === "") return "";
    if (typeof valor === "string") return valor;
    const num = Number(valor);
    if (!Number.isFinite(num) || num <= 0) return "";
    return num > 100 ? `${Math.round(num)} m` : `${num.toFixed(num >= 10 ? 0 : 1)} km`;
}

export function normalizarCoord(coord) {
    const lat = Number(coord?.lat ?? coord?.latitude);
    const lng = Number(coord?.lng ?? coord?.lon ?? coord?.longitude);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

export function calcularDistanciaMetros(a, b) {
    const earth = 6371000;
    const toRad = value => value * Math.PI / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * earth * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
