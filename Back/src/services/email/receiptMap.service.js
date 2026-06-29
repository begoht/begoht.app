const { PNG } = require("pngjs");

const WIDTH = 640;
const HEIGHT = 320;
const TILE_SIZE = 256;
const MAP_PADDING = 44;
const TILE_CACHE_LIMIT = 192;
const DEFAULT_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const tileCache = new Map();

async function generarMapaRecibo({ origen, destino, ruta = [], cargarMapaBase = true } = {}) {
  const geoPoints = normalizeGeoPoints([origen, ...ruta, destino]);
  const viewport = calculateViewport(geoPoints);
  let map;

  if (cargarMapaBase && viewport) {
    try {
      map = await renderTileMap(viewport);
    } catch (error) {
      console.warn("Mapa real del recibo no disponible; se usa respaldo:", error.message);
    }
  }

  if (!map) map = createFallbackMap();

  const projected = projectToViewport(geoPoints, viewport);
  if (projected.length >= 2) {
    const route = simplifyProjectedRoute(projected);
    drawPolyline(map.data, route, [255, 255, 255, 255], 12);
    drawPolyline(map.data, route, [17, 24, 39, 255], 7);
    drawMarker(map.data, route[0], "start");
    drawMarker(map.data, route[route.length - 1], "end");
  }

  return PNG.sync.write(map, { colorType: 6, inputColorType: 6 });
}

function normalizeGeoPoints(points) {
  const normalized = [];
  for (const point of points) {
    const lat = Number(point?.lat ?? point?.latitude);
    const lng = Number(point?.lng ?? point?.lon ?? point?.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (lat < -85.0511 || lat > 85.0511 || lng < -180 || lng > 180) continue;
    const previous = normalized[normalized.length - 1];
    if (!previous || previous.lat !== lat || previous.lng !== lng) normalized.push({ lat, lng });
  }
  return normalized;
}

function calculateViewport(points) {
  if (points.length < 2) return null;

  for (let zoom = 18; zoom >= 3; zoom -= 1) {
    const world = points.map((point) => toWorldPixel(point, zoom));
    const xs = world.map((point) => point.x);
    const ys = world.map((point) => point.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    if (maxX - minX <= WIDTH - MAP_PADDING * 2 && maxY - minY <= HEIGHT - MAP_PADDING * 2) {
      return {
        zoom,
        left: (minX + maxX) / 2 - WIDTH / 2,
        top: (minY + maxY) / 2 - HEIGHT / 2,
      };
    }
  }

  const world = points.map((point) => toWorldPixel(point, 3));
  return {
    zoom: 3,
    left: (Math.min(...world.map((point) => point.x)) + Math.max(...world.map((point) => point.x))) / 2 - WIDTH / 2,
    top: (Math.min(...world.map((point) => point.y)) + Math.max(...world.map((point) => point.y))) / 2 - HEIGHT / 2,
  };
}

function toWorldPixel(point, zoom) {
  const scale = TILE_SIZE * (2 ** zoom);
  const latRadians = Math.max(-85.0511, Math.min(85.0511, point.lat)) * Math.PI / 180;
  return {
    x: ((point.lng + 180) / 360) * scale,
    y: (1 - Math.asinh(Math.tan(latRadians)) / Math.PI) / 2 * scale,
  };
}

function projectToViewport(points, viewport) {
  if (!viewport) return projectFallback(points);
  return points.map((point) => {
    const world = toWorldPixel(point, viewport.zoom);
    return { x: Math.round(world.x - viewport.left), y: Math.round(world.y - viewport.top) };
  });
}

function projectFallback(points) {
  if (points.length < 2) return [];
  const lats = points.map((point) => point.lat);
  const lngs = points.map((point) => point.lng);
  let minLat = Math.min(...lats);
  let maxLat = Math.max(...lats);
  let minLng = Math.min(...lngs);
  let maxLng = Math.max(...lngs);
  if (maxLat - minLat < 0.0005) { minLat -= 0.00025; maxLat += 0.00025; }
  if (maxLng - minLng < 0.0005) { minLng -= 0.00025; maxLng += 0.00025; }
  const latScale = (HEIGHT - MAP_PADDING * 2) / (maxLat - minLat);
  const lngScale = (WIDTH - MAP_PADDING * 2) / (maxLng - minLng);
  const scale = Math.min(latScale, lngScale);
  const contentWidth = (maxLng - minLng) * scale;
  const contentHeight = (maxLat - minLat) * scale;
  return points.map((point) => ({
    x: Math.round((WIDTH - contentWidth) / 2 + (point.lng - minLng) * scale),
    y: Math.round((HEIGHT - contentHeight) / 2 + (maxLat - point.lat) * scale),
  }));
}

async function renderTileMap(viewport) {
  const map = new PNG({ width: WIDTH, height: HEIGHT });
  fill(map.data, 238, 242, 244, 255);
  const minTileX = Math.floor(viewport.left / TILE_SIZE);
  const maxTileX = Math.floor((viewport.left + WIDTH - 1) / TILE_SIZE);
  const minTileY = Math.floor(viewport.top / TILE_SIZE);
  const maxTileY = Math.floor((viewport.top + HEIGHT - 1) / TILE_SIZE);
  const tileCount = 2 ** viewport.zoom;
  const jobs = [];

  for (let tileY = minTileY; tileY <= maxTileY; tileY += 1) {
    if (tileY < 0 || tileY >= tileCount) continue;
    for (let tileX = minTileX; tileX <= maxTileX; tileX += 1) {
      const wrappedX = ((tileX % tileCount) + tileCount) % tileCount;
      jobs.push(loadTile(viewport.zoom, wrappedX, tileY).then((tile) => ({ tile, tileX, tileY })));
    }
  }

  const tiles = await Promise.all(jobs);
  for (const { tile, tileX, tileY } of tiles) {
    blitTile(map, tile, Math.round(tileX * TILE_SIZE - viewport.left), Math.round(tileY * TILE_SIZE - viewport.top));
  }
  return map;
}

async function loadTile(zoom, x, y) {
  const template = process.env.RECEIPT_MAP_TILE_URL || DEFAULT_TILE_URL;
  const url = template.replace("{z}", zoom).replace("{x}", x).replace("{y}", y);
  if (tileCache.has(url)) return tileCache.get(url);

  const pending = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Number(process.env.RECEIPT_MAP_TIMEOUT_MS || 6500));
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: "image/png,image/*",
          "User-Agent": process.env.RECEIPT_MAP_USER_AGENT || "BeGO/1.0 (support@bego.com.ht)",
        },
      });
      if (!response.ok) throw new Error(`tile HTTP ${response.status}`);
      return PNG.sync.read(Buffer.from(await response.arrayBuffer()));
    } finally {
      clearTimeout(timeout);
    }
  })();

  tileCache.set(url, pending);
  trimTileCache();
  try {
    return await pending;
  } catch (error) {
    tileCache.delete(url);
    throw error;
  }
}

function trimTileCache() {
  while (tileCache.size > TILE_CACHE_LIMIT) tileCache.delete(tileCache.keys().next().value);
}

function blitTile(target, tile, offsetX, offsetY) {
  for (let sourceY = 0; sourceY < tile.height; sourceY += 1) {
    const targetY = offsetY + sourceY;
    if (targetY < 0 || targetY >= HEIGHT) continue;
    for (let sourceX = 0; sourceX < tile.width; sourceX += 1) {
      const targetX = offsetX + sourceX;
      if (targetX < 0 || targetX >= WIDTH) continue;
      const sourceOffset = (sourceY * tile.width + sourceX) * 4;
      const targetOffset = (targetY * WIDTH + targetX) * 4;
      tile.data.copy(target.data, targetOffset, sourceOffset, sourceOffset + 4);
    }
  }
}

function createFallbackMap() {
  const map = new PNG({ width: WIDTH, height: HEIGHT });
  fill(map.data, 239, 243, 244, 255);
  fillRect(map.data, 35, 25, 155, 86, [222, 237, 220, 255]);
  fillRect(map.data, 475, 205, 130, 88, [218, 236, 224, 255]);
  fillRect(map.data, 250, 118, 95, 58, [225, 239, 221, 255]);
  const minor = [216, 222, 226, 255];
  for (let x = 20; x < WIDTH; x += 58) drawLine(map.data, x, 0, x + 42, HEIGHT - 1, minor, 2);
  for (let y = 24; y < HEIGHT; y += 52) drawLine(map.data, 0, y, WIDTH - 1, y + 18, minor, 2);
  return map;
}

function simplifyProjectedRoute(points) {
  const simplified = [];
  for (const point of points) {
    const previous = simplified[simplified.length - 1];
    if (!previous || Math.abs(previous.x - point.x) + Math.abs(previous.y - point.y) >= 2) simplified.push(point);
  }
  if (simplified.length === 1 && points.length > 1) simplified.push(points[points.length - 1]);
  return simplified;
}

function drawMarker(pixels, point, type) {
  drawCircle(pixels, point.x, point.y, 13, [255, 255, 255, 255]);
  if (type === "start") {
    drawCircle(pixels, point.x, point.y, 8, [37, 99, 235, 255]);
    drawCircle(pixels, point.x, point.y, 3, [255, 255, 255, 255]);
  } else {
    fillRect(pixels, point.x - 8, point.y - 8, 16, 16, [17, 24, 39, 255]);
    fillRect(pixels, point.x - 3, point.y - 3, 6, 6, [255, 255, 255, 255]);
  }
}

function fill(pixels, r, g, b, a) {
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = r; pixels[i + 1] = g; pixels[i + 2] = b; pixels[i + 3] = a;
  }
}

function setPixel(pixels, x, y, color) {
  if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return;
  const offset = (y * WIDTH + x) * 4;
  pixels[offset] = color[0]; pixels[offset + 1] = color[1]; pixels[offset + 2] = color[2]; pixels[offset + 3] = color[3];
}

function fillRect(pixels, x, y, width, height, color) {
  for (let py = Math.max(0, y); py < Math.min(HEIGHT, y + height); py += 1) {
    for (let px = Math.max(0, x); px < Math.min(WIDTH, x + width); px += 1) setPixel(pixels, px, py, color);
  }
}

function drawCircle(pixels, cx, cy, radius, color) {
  const radiusSquared = radius * radius;
  for (let y = -radius; y <= radius; y += 1) {
    for (let x = -radius; x <= radius; x += 1) {
      if (x * x + y * y <= radiusSquared) setPixel(pixels, cx + x, cy + y, color);
    }
  }
}

function drawPolyline(pixels, points, color, thickness) {
  for (let i = 1; i < points.length; i += 1) drawLine(pixels, points[i - 1].x, points[i - 1].y, points[i].x, points[i].y, color, thickness);
}

function drawLine(pixels, x0, y0, x1, y1, color, thickness = 1) {
  let startX = Math.round(x0);
  let startY = Math.round(y0);
  const endX = Math.round(x1);
  const endY = Math.round(y1);
  const dx = Math.abs(endX - startX);
  const sx = startX < endX ? 1 : -1;
  const dy = -Math.abs(endY - startY);
  const sy = startY < endY ? 1 : -1;
  let error = dx + dy;
  const radius = Math.max(0, Math.floor(thickness / 2));
  while (true) {
    drawCircle(pixels, startX, startY, radius, color);
    if (startX === endX && startY === endY) break;
    const doubled = 2 * error;
    if (doubled >= dy) { error += dy; startX += sx; }
    if (doubled <= dx) { error += dx; startY += sy; }
  }
}

module.exports = { generarMapaRecibo };
