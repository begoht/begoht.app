const DEFAULT_ICON_HEADING_DEG = 90;
const DEFAULT_MAX_SNAP_METERS = 70;
const MIN_HEADING_MOVE_METERS = 2;

export function normalizeLatLng(input) {
  if (!input) return null;

  const lat = Number(input.lat ?? input[0]);
  const lng = Number(input.lng ?? input[1]);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return { lat, lng };
}

export function bearingDeg(from, to) {
  const start = normalizeLatLng(from);
  const end = normalizeLatLng(to);

  if (!start || !end || distanceMeters(start, end) < MIN_HEADING_MOVE_METERS) {
    return null;
  }

  const toRad = (value) => value * Math.PI / 180;
  const toDeg = (value) => value * 180 / Math.PI;
  const lat1 = toRad(start.lat);
  const lat2 = toRad(end.lat);
  const dLng = toRad(end.lng - start.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export function distanceMeters(a, b) {
  const start = normalizeLatLng(a);
  const end = normalizeLatLng(b);

  if (!start || !end) return Infinity;

  const earth = 6371000;
  const toRad = (value) => value * Math.PI / 180;
  const dLat = toRad(end.lat - start.lat);
  const dLng = toRad(end.lng - start.lng);
  const lat1 = toRad(start.lat);
  const lat2 = toRad(end.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * earth * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function resolveMotorcyclePose(map, rawLatLng, {
  routeCoords = [],
  previousLatLng = null,
  heading = null,
  maxSnapDistanceMeters = DEFAULT_MAX_SNAP_METERS
} = {}) {
  const raw = normalizeLatLng(rawLatLng);
  if (!raw) return null;

  const snapped = snapToRoute(map, raw, routeCoords, maxSnapDistanceMeters);
  const latLng = snapped?.latLng || raw;
  const previous = normalizeLatLng(previousLatLng);
  const hasGpsHeading = heading != null && Number.isFinite(Number(heading));
  const gpsHeading = hasGpsHeading ? Number(heading) : null;
  const computedHeading =
    gpsHeading != null && gpsHeading >= 0
      ? gpsHeading
      : bearingDeg(previous, latLng) ?? snapped?.heading ?? null;

  return {
    latLng,
    heading: computedHeading,
    snapped: !!snapped
  };
}

export function setMotorcycleMarkerPose(marker, map, rawLatLng, options = {}) {
  if (!marker) return null;

  const pose = resolveMotorcyclePose(map, rawLatLng, {
    previousLatLng: marker.getLatLng?.(),
    ...options
  });

  if (!pose) return null;

  marker.setLatLng([pose.latLng.lat, pose.latLng.lng]);
  applyMotorcycleHeading(marker, pose.heading);

  return pose;
}

export function applyMotorcycleHeading(marker, heading) {
  const numericHeading = Number(heading);

  if (!marker || !Number.isFinite(numericHeading)) return;

  marker._begoHeading = numericHeading;

  requestAnimationFrame(() => {
    const element = marker.getElement?.();
    if (!element) return;

    const baseTransform = (element.style.transform || "")
      .replace(/\srotate\([-0-9.]+deg\)/g, "")
      .trim();
    const rotation = numericHeading - DEFAULT_ICON_HEADING_DEG;

    element.style.transformOrigin = "50% 50%";
    element.style.transform = `${baseTransform} rotate(${rotation.toFixed(1)}deg)`;
  });
}

function snapToRoute(map, rawLatLng, routeCoords, maxDistanceMeters) {
  if (!map || !Array.isArray(routeCoords) || routeCoords.length < 2) {
    return null;
  }

  const raw = normalizeLatLng(rawLatLng);
  if (!raw) return null;

  const rawPoint = map.latLngToLayerPoint(raw);
  let best = null;

  for (let i = 0; i < routeCoords.length - 1; i++) {
    const a = normalizeLatLng(routeCoords[i]);
    const b = normalizeLatLng(routeCoords[i + 1]);
    if (!a || !b) continue;

    const pointA = map.latLngToLayerPoint(a);
    const pointB = map.latLngToLayerPoint(b);
    const projected = projectPointOnSegment(rawPoint, pointA, pointB);
    const pixelDistance = rawPoint.distanceTo(projected);

    if (!best || pixelDistance < best.pixelDistance) {
      const latLng = map.layerPointToLatLng(projected);
      best = {
        latLng: { lat: latLng.lat, lng: latLng.lng },
        pixelDistance,
        heading: bearingDeg(a, b)
      };
    }
  }

  if (!best) return null;

  const meters = distanceMeters(raw, best.latLng);
  return meters <= maxDistanceMeters ? best : null;
}

function projectPointOnSegment(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSq = dx * dx + dy * dy;

  if (!lengthSq) return start;

  const t = Math.max(
    0,
    Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSq)
  );

  return L.point(start.x + t * dx, start.y + t * dy);
}
