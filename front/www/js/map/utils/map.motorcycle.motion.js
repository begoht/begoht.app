const DEFAULT_ICON_HEADING_DEG = 90;
const DEFAULT_MAX_SNAP_METERS = 70;
const MIN_HEADING_MOVE_METERS = 2;
const GPS_HEADING_ACCEPT_DEG = 75;
const GPS_FLIP_GUARD_DEG = 135;
const HEADING_SMOOTHING = 0.58;
const DEFAULT_MOVE_DURATION_MS = 900;
const MAX_ANIMATED_MOVE_METERS = 900;

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

export function normalizeHeading(value) {
  const heading = Number(value);

  if (!Number.isFinite(heading) || heading < 0) return null;

  return ((heading % 360) + 360) % 360;
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
  const headingSelection = selectHeading({
    gpsHeading: heading,
    movementHeading: bearingDeg(previous, latLng),
    routeHeading: snapped?.heading,
    snapped: !!snapped
  });

  return {
    latLng,
    heading: headingSelection.heading,
    headingSource: headingSelection.source,
    snapped: !!snapped,
    routeProgress: snapped?.progress || null
  };
}

export function setMotorcycleMarkerPose(marker, map, rawLatLng, options = {}) {
  if (!marker) return null;

  const previousLatLng = marker.getLatLng?.();
  const pose = resolveMotorcyclePose(map, rawLatLng, {
    previousLatLng,
    ...options
  });

  if (!pose) return null;

  const previousRouteSnap = snapToRoute(
    map,
    previousLatLng,
    options.routeCoords,
    options.maxSnapDistanceMeters ?? DEFAULT_MAX_SNAP_METERS
  );

  moveMarker(marker, previousLatLng, pose.latLng, {
    ...options,
    routeFromProgress: previousRouteSnap?.progress || marker._begoRouteProgress || null,
    routeToProgress: pose.routeProgress
  });
  marker._begoRouteProgress = pose.routeProgress || null;
  applyMotorcycleHeading(marker, pose.heading, {
    source: pose.headingSource
  });

  return pose;
}

function moveMarker(marker, fromLatLng, toLatLng, {
  animate = true,
  durationMs = DEFAULT_MOVE_DURATION_MS,
  routeCoords = [],
  routeFromProgress = null,
  routeToProgress = null,
  onMove = null
} = {}) {
  const from = normalizeLatLng(fromLatLng);
  const to = normalizeLatLng(toLatLng);
  if (!to) return;

  if (marker._begoMoveFrame) {
    cancelAnimationFrame(marker._begoMoveFrame);
    marker._begoMoveFrame = null;
  }

  const moveDistance = from ? distanceMeters(from, to) : Infinity;
  const shouldAnimate =
    animate &&
    from &&
    !document.hidden &&
    moveDistance > 1 &&
    moveDistance <= MAX_ANIMATED_MOVE_METERS &&
    typeof requestAnimationFrame === "function";

  if (!shouldAnimate) {
    setMarkerPosition(marker, to, onMove);
    marker._begoMoveTarget = to;
    return;
  }

  const startedAt = performance.now();
  marker._begoMoveTarget = to;
  const routePath = buildRouteAnimationPath(
    routeCoords,
    routeFromProgress,
    routeToProgress
  );

  const tick = (now) => {
    const elapsed = now - startedAt;
    const progress = easeInOutCubic(Math.min(1, elapsed / durationMs));
    const next = interpolateMovePoint(from, to, routePath, progress);

    setMarkerPosition(marker, next, onMove);

    if (progress < 1) {
      marker._begoMoveFrame = requestAnimationFrame(tick);
      return;
    }

    setMarkerPosition(marker, to, onMove);
    marker._begoMoveFrame = null;
  };

  marker._begoMoveFrame = requestAnimationFrame(tick);
}

function setMarkerPosition(marker, point, onMove) {
  marker.setLatLng([point.lat, point.lng]);
  if (typeof onMove === "function") onMove({ lat: point.lat, lng: point.lng });
}

function easeInOutCubic(t) {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - ((-2 * t + 2) ** 3) / 2;
}

function interpolateMovePoint(from, to, routePath, progress) {
  const onRoute = interpolateAlongPath(routePath, progress);
  if (onRoute) return onRoute;

  return {
    lat: from.lat + (to.lat - from.lat) * progress,
    lng: from.lng + (to.lng - from.lng) * progress
  };
}

function buildRouteAnimationPath(routeCoords, fromProgress, toProgress) {
  const route = normalizarRouteCoords(routeCoords);
  if (!route.length || !fromProgress || !toProgress) return null;

  const fromIndex = Number(fromProgress.segmentIndex);
  const toIndex = Number(toProgress.segmentIndex);
  const fromT = Number(fromProgress.segmentT);
  const toT = Number(toProgress.segmentT);

  if (
    !Number.isFinite(fromIndex) ||
    !Number.isFinite(toIndex) ||
    !Number.isFinite(fromT) ||
    !Number.isFinite(toT)
  ) {
    return null;
  }

  const fromAbs = fromIndex + fromT;
  const toAbs = toIndex + toT;

  if (toAbs < fromAbs || toAbs - fromAbs < 0.0001) return null;

  const points = [normalizeLatLng(fromProgress.latLng)];

  for (let i = fromIndex + 1; i <= toIndex && i < route.length; i++) {
    points.push(route[i]);
  }

  points.push(normalizeLatLng(toProgress.latLng));

  return compactRoutePath(points);
}

function interpolateAlongPath(path, progress) {
  if (!Array.isArray(path) || path.length < 2) return null;

  const segments = [];
  let total = 0;

  for (let i = 0; i < path.length - 1; i++) {
    const start = normalizeLatLng(path[i]);
    const end = normalizeLatLng(path[i + 1]);
    if (!start || !end) continue;

    const length = distanceMeters(start, end);
    if (!Number.isFinite(length) || length <= 0) continue;

    segments.push({ start, end, length });
    total += length;
  }

  if (!segments.length || total <= 0) return null;

  let remaining = total * Math.max(0, Math.min(1, progress));

  for (const segment of segments) {
    if (remaining > segment.length) {
      remaining -= segment.length;
      continue;
    }

    const segmentProgress = remaining / segment.length;
    return {
      lat: segment.start.lat + (segment.end.lat - segment.start.lat) * segmentProgress,
      lng: segment.start.lng + (segment.end.lng - segment.start.lng) * segmentProgress
    };
  }

  return segments[segments.length - 1].end;
}

export function applyMotorcycleHeading(marker, heading, { source = null } = {}) {
  const numericHeading = normalizeHeading(heading);

  if (!marker || numericHeading == null) return;

  const stableHeading = stabilizeHeading(marker, numericHeading, source);
  marker._begoHeading = stableHeading;
  marker._begoHeadingSource = source;

  if (typeof marker.setRotation === "function") {
    marker.options.rotateWithView = true;
    marker.setRotation(
      (stableHeading - DEFAULT_ICON_HEADING_DEG) * Math.PI / 180
    );
    return;
  }

  requestAnimationFrame(() => {
    const element = marker.getElement?.();
    if (!element) return;

    const baseTransform = (element.style.transform || "")
      .replace(/(?:\s+)?rotate\([-0-9.]+deg\)/g, "")
      .trim();
    const rotation = stableHeading - DEFAULT_ICON_HEADING_DEG;

    element.style.transformOrigin = "50% 50%";
    element.style.transform = `${baseTransform} rotate(${rotation.toFixed(1)}deg)`;
  });
}

function selectHeading({ gpsHeading, movementHeading, routeHeading, snapped }) {
  const gps = normalizeHeading(gpsHeading);
  const movement = normalizeHeading(movementHeading);
  const route = normalizeHeading(routeHeading);

  if (snapped && route != null) {
    return {
      heading: route,
      source: "route"
    };
  }

  if (movement != null) {
    if (gps != null && angleDiff(gps, movement) <= GPS_HEADING_ACCEPT_DEG) {
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

  if (route != null) {
    return {
      heading: route,
      source: "route"
    };
  }

  return {
    heading: gps,
    source: gps == null ? null : "gps"
  };
}

function stabilizeHeading(marker, nextHeading, source) {
  const previous = normalizeHeading(marker?._begoHeading);

  if (previous == null) return nextHeading;

  const delta = shortestHeadingDelta(previous, nextHeading);

  if (source === "gps" && Math.abs(delta) > GPS_FLIP_GUARD_DEG) {
    return previous;
  }

  return normalizeHeading(previous + delta * HEADING_SMOOTHING);
}

function shortestHeadingDelta(from, to) {
  return ((to - from + 540) % 360) - 180;
}

function angleDiff(a, b) {
  return Math.abs(shortestHeadingDelta(a, b));
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
    const pixelDistance = rawPoint.distanceTo(projected.point);

    if (!best || pixelDistance < best.pixelDistance) {
      const latLng = map.layerPointToLatLng(projected.point);
      const normalizedLatLng = { lat: latLng.lat, lng: latLng.lng };
      best = {
        latLng: normalizedLatLng,
        pixelDistance,
        heading: bearingDeg(a, b),
        progress: {
          segmentIndex: i,
          segmentT: projected.t,
          latLng: normalizedLatLng
        }
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

  if (!lengthSq) {
    return {
      point: start,
      t: 0
    };
  }

  const t = Math.max(
    0,
    Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSq)
  );

  return {
    point: L.point(start.x + t * dx, start.y + t * dy),
    t
  };
}

function normalizarRouteCoords(routeCoords = []) {
  if (!Array.isArray(routeCoords)) return [];

  return routeCoords
    .map(normalizeLatLng)
    .filter(Boolean);
}

function compactRoutePath(points = []) {
  const compacted = [];

  points.forEach((point) => {
    const normalized = normalizeLatLng(point);
    if (!normalized) return;

    const previous = compacted[compacted.length - 1];
    if (previous && distanceMeters(previous, normalized) < 0.35) return;

    compacted.push(normalized);
  });

  return compacted.length >= 2 ? compacted : null;
}
