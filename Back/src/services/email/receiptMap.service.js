const zlib = require("zlib");

const WIDTH = 640;
const HEIGHT = 320;

function generarMapaRecibo({ origen, destino, ruta = [] } = {}) {
  const pixels = Buffer.alloc(WIDTH * HEIGHT * 4);
  fill(pixels, 239, 243, 244, 255);

  drawMapBase(pixels);

  const geoPoints = normalizeGeoPoints([
    origen,
    ...ruta,
    destino,
  ]);
  const projected = projectPoints(geoPoints);

  if (projected.length >= 2) {
    drawPolyline(pixels, projected, [255, 255, 255, 255], 11);
    drawPolyline(pixels, projected, [17, 24, 39, 255], 6);
    drawMarker(pixels, projected[0], "start");
    drawMarker(pixels, projected[projected.length - 1], "end");
  }

  return encodePng(pixels, WIDTH, HEIGHT);
}

function normalizeGeoPoints(points) {
  const normalized = [];
  for (const point of points) {
    const lat = Number(point?.lat);
    const lng = Number(point?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const previous = normalized[normalized.length - 1];
    if (!previous || previous.lat !== lat || previous.lng !== lng) {
      normalized.push({ lat, lng });
    }
  }
  return normalized;
}

function projectPoints(points) {
  if (points.length < 2) return [];
  const lats = points.map((point) => point.lat);
  const lngs = points.map((point) => point.lng);
  let minLat = Math.min(...lats);
  let maxLat = Math.max(...lats);
  let minLng = Math.min(...lngs);
  let maxLng = Math.max(...lngs);

  if (maxLat - minLat < 0.0005) {
    minLat -= 0.00025;
    maxLat += 0.00025;
  }
  if (maxLng - minLng < 0.0005) {
    minLng -= 0.00025;
    maxLng += 0.00025;
  }

  const padding = 42;
  const usableWidth = WIDTH - padding * 2;
  const usableHeight = HEIGHT - padding * 2;

  return points.map((point) => ({
    x: Math.round(padding + ((point.lng - minLng) / (maxLng - minLng)) * usableWidth),
    y: Math.round(padding + (1 - (point.lat - minLat) / (maxLat - minLat)) * usableHeight),
  }));
}

function drawMapBase(pixels) {
  fillRect(pixels, 35, 25, 155, 86, [222, 237, 220, 255]);
  fillRect(pixels, 475, 205, 130, 88, [218, 236, 224, 255]);
  fillRect(pixels, 250, 118, 95, 58, [225, 239, 221, 255]);

  const minor = [216, 222, 226, 255];
  const major = [202, 211, 216, 255];
  for (let x = 20; x < WIDTH; x += 58) drawLine(pixels, x, 0, x + 42, HEIGHT - 1, minor, 2);
  for (let y = 24; y < HEIGHT; y += 52) drawLine(pixels, 0, y, WIDTH - 1, y + 18, minor, 2);
  drawLine(pixels, -20, 265, 660, 55, major, 7);
  drawLine(pixels, 75, -20, 430, 340, major, 6);
  drawLine(pixels, 360, -10, 610, 330, major, 5);
  drawLine(pixels, -20, 120, 660, 185, [249, 250, 251, 255], 12);
  drawLine(pixels, -20, 120, 660, 185, major, 2);
}

function drawMarker(pixels, point, type) {
  drawCircle(pixels, point.x, point.y, 11, [255, 255, 255, 255]);
  if (type === "start") {
    drawCircle(pixels, point.x, point.y, 7, [37, 99, 235, 255]);
  } else {
    fillRect(pixels, point.x - 7, point.y - 7, 14, 14, [17, 24, 39, 255]);
    fillRect(pixels, point.x - 3, point.y - 3, 6, 6, [255, 255, 255, 255]);
  }
}

function fill(pixels, r, g, b, a) {
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = r;
    pixels[i + 1] = g;
    pixels[i + 2] = b;
    pixels[i + 3] = a;
  }
}

function setPixel(pixels, x, y, color) {
  if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return;
  const offset = (y * WIDTH + x) * 4;
  pixels[offset] = color[0];
  pixels[offset + 1] = color[1];
  pixels[offset + 2] = color[2];
  pixels[offset + 3] = color[3];
}

function fillRect(pixels, x, y, width, height, color) {
  for (let py = Math.max(0, y); py < Math.min(HEIGHT, y + height); py += 1) {
    for (let px = Math.max(0, x); px < Math.min(WIDTH, x + width); px += 1) {
      setPixel(pixels, px, py, color);
    }
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
  for (let i = 1; i < points.length; i += 1) {
    drawLine(pixels, points[i - 1].x, points[i - 1].y, points[i].x, points[i].y, color, thickness);
  }
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
    if (doubled >= dy) {
      error += dy;
      startX += sx;
    }
    if (doubled <= dx) {
      error += dx;
      startY += sy;
    }
  }
}

function encodePng(pixels, width, height) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 0;
    pixels.copy(raw, rowStart + 1, y * stride, (y + 1) * stride);
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  return Buffer.concat([
    signature,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const output = Buffer.alloc(12 + data.length);
  output.writeUInt32BE(data.length, 0);
  typeBuffer.copy(output, 4);
  data.copy(output, 8);
  output.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 8 + data.length);
  return output;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

module.exports = { generarMapaRecibo };
