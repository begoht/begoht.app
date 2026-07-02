const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function readWorkspaceFile(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, "..", "..", relativePath), "utf8");
}

test("flujo ida/vuelta: al terminar la ida queda pendiente y el pasajero puede anular", () => {
  const finalizar = readWorkspaceFile("Back/src/services/finalizarViaje.service.js");
  const service = readWorkspaceFile("Back/src/services/idaVuelta.service.js");
  const passengerHandler = readWorkspaceFile("front/www/js/socket/handlers/idaVuelta.handler.js");
  const passengerSocket = readWorkspaceFile("front/www/js/socket/pasajero.socket.js");

  assert.match(finalizar, /marcarRetornoPendiente/);
  assert.doesNotMatch(finalizar, /marcarRetornoEnCurso/);
  assert.match(finalizar, /estado:\s*"retorno_pendiente"/);
  assert.match(service, /ESTADO_RETORNO_PENDIENTE/);
  assert.match(service, /ida-vuelta:pendiente/);

  assert.match(passengerSocket, /idaVuelta\.handler\.js\?v=20260628-dark-route-locked/);
  assert.match(passengerHandler, /const\s+RETORNO_AUTO_START_MS\s*=/);
  assert.match(passengerHandler, /id="btnAnularVueltaPasajero"/);
  assert.match(passengerHandler, />\s*Anular vuelta\s*</);
  assert.match(passengerHandler, /ida-vuelta:anular-retorno/);
  assert.match(passengerHandler, /ida-vuelta:iniciar-retorno/);
  assert.match(passengerHandler, /setTimeout\(\(\)\s*=>\s*{\s*iniciarRetornoAutomatico/s);
  assert.doesNotMatch(passengerHandler, /btnHacerVuelta|Hacer vuelta/);
});

test("cadena de cache: la app pasajero carga el handler nuevo de vuelta", () => {
  const index = readWorkspaceFile("front/www/index.html");
  const app = readWorkspaceFile("front/www/js/core/app/app.js");
  const router = readWorkspaceFile("front/www/js/core/router/router.js");
  const lifecycle = readWorkspaceFile("front/www/js/core/app/app.lifecycle.js");
  const passengerMain = readWorkspaceFile("front/www/js/pasajero/pasajero.main.js");
  const passengerSocket = readWorkspaceFile("front/www/js/socket/pasajero.socket.js");

  assert.match(index, /app\.js\?v=20260701-visible-labels/);
  assert.match(app, /router\.js\?v=20260701-follow-zoom/);
  assert.match(router, /app\.lifecycle\.js\?v=20260701-follow-zoom/);
  assert.match(lifecycle, /pasajero\.main\.js\?v=20260701-follow-zoom/);
  assert.match(passengerMain, /pasajero\.socket\.js\?v=20260701-follow-zoom/);
  assert.match(passengerSocket, /idaVuelta\.handler\.js\?v=20260628-dark-route-locked/);
});

test("cierre pasajero: recupera la finalizacion si la app estaba cerrada", () => {
  const handlers = readWorkspaceFile("Back/src/sockets/viajes/pasajeros/pasajero.handlers.js");
  const replay = readWorkspaceFile("Back/src/sockets/viajes/pasajeros/services/replay.service.js");
  const repo = readWorkspaceFile("Back/src/sockets/viajes/pasajeros/repositories/viaje.repository.js");
  const passengerSocket = readWorkspaceFile("front/www/js/socket/pasajero.socket.js");
  const receipt = readWorkspaceFile("front/www/js/socket/pasajero.utils.js");

  assert.match(handlers, /sync-pasajero", \(payload = \{\}\)/);
  assert.match(replay, /findFinalizadoParaPasajero/);
  assert.match(replay, /socket\.emit\("viaje-finalizado", prepararFinalizado/);
  assert.match(repo, /pasajero:\s*pasajeroId[\s\S]*estado:\s*"finalizado"/);
  assert.match(passengerSocket, /sync-pasajero", \{ viajeId: getStoredViajeId\(\) \}/);
  assert.match(receipt, /guardarFinalizacionPendiente\(snapshot\)/);
  assert.match(receipt, /id="cerrarModalViaje" class="finalizado-btn">Listo</);
  assert.doesNotMatch(receipt, /id="guardarRecibo"|receipt-payment-summary/);
});

test("recibo de viaje: el detalle completo se envia por email y PDF", async () => {
  const emailService = readWorkspaceFile("Back/src/services/email/email.service.js");
  const finalizar = readWorkspaceFile("Back/src/services/finalizarViaje.service.js");
  const { generarMapaRecibo } = require("../src/services/email/receiptMap.service");

  assert.match(finalizar, /precioBase: viaje\.precioBase/);
  assert.match(finalizar, /descuentoWallet: viaje\.descuentoWallet/);
  assert.match(finalizar, /vehiculo: viaje\.motorista\?\.vehiculo/);
  assert.match(emailService, /Merci d'avoir choisi BeGO, \$\{safeName\}/);
  assert.match(emailService, /Tarif \$\{isDelivery \? "de livraison" : "de la course"\}/);
  assert.match(emailService, /Remise Wallet/);
  assert.match(emailService, /Votre conducteur/);
  assert.match(emailService, /cid:bego-route-map/);
  assert.match(emailService, /Telecharger le PDF/);
  assert.match(emailService, /Besoin d'aide/);
  assert.match(emailService, /Objet oublie/);
  assert.match(emailService, /Voir l'historique de vos trajets/);
  assert.match(emailService, /attachments:/);
  assert.match(emailService, /content_type:/);

  const map = await generarMapaRecibo({
    origen: { lat: 18.235, lng: -72.535 },
    destino: { lat: 18.242, lng: -72.526 },
    ruta: [{ lat: 18.237, lng: -72.532 }, { lat: 18.24, lng: -72.53 }],
    cargarMapaBase: false,
  });
  assert.equal(map.subarray(1, 4).toString(), "PNG");
  assert.ok(map.length > 1000);
});

test("mapa del recibo: compone cartografia real y conserva la trayectoria", async () => {
  const { PNG } = require("pngjs");
  const { generarMapaRecibo } = require("../src/services/email/receiptMap.service");
  const previousFetch = global.fetch;
  const previousTemplate = process.env.RECEIPT_MAP_TILE_URL;
  const tile = new PNG({ width: 256, height: 256 });
  for (let index = 0; index < tile.data.length; index += 4) {
    tile.data[index] = 203;
    tile.data[index + 1] = 213;
    tile.data[index + 2] = 223;
    tile.data[index + 3] = 255;
  }
  const tileBuffer = PNG.sync.write(tile);

  process.env.RECEIPT_MAP_TILE_URL = "https://tiles.test/{z}/{x}/{y}.png";
  global.fetch = async () => ({ ok: true, arrayBuffer: async () => tileBuffer });
  try {
    const output = await generarMapaRecibo({
      origen: { lat: 18.5392, lng: -72.3364 },
      ruta: [{ lat: 18.5414, lng: -72.3335 }, { lat: 18.5438, lng: -72.3304 }],
      destino: { lat: 18.5462, lng: -72.3278 },
    });
    const parsed = PNG.sync.read(output);
    assert.equal(parsed.width, 640);
    assert.equal(parsed.height, 320);
    assert.deepEqual([...parsed.data.subarray(0, 3)], [203, 213, 223]);
    assert.ok(parsed.data.some((value, index) => index % 4 === 0 && value === 17));
  } finally {
    global.fetch = previousFetch;
    if (previousTemplate == null) delete process.env.RECEIPT_MAP_TILE_URL;
    else process.env.RECEIPT_MAP_TILE_URL = previousTemplate;
  }
});

test("mapa en viaje: usa una capa con etiquetas, conserva el origen y rota la ruta unida", () => {
  const geo = readWorkspaceFile("front/www/js/map/map.geo.js");
  const iniciado = readWorkspaceFile("front/www/js/socket/handlers/iniciado.handler.js");
  const llego = readWorkspaceFile("front/www/js/socket/handlers/llego.handler.js");
  const track = readWorkspaceFile("front/www/js/socket/handlers/track.handler.js");
  const sync = readWorkspaceFile("front/www/js/socket/handlers/sync.handler.js");
  const routeRenderer = readWorkspaceFile("front/www/js/map/ui/map.route.renderer.js");
  const routeController = readWorkspaceFile("front/www/js/map/controllers/map.route.controller.js");
  const mapSingleton = readWorkspaceFile("front/www/js/map/map.singleton.js");
  const motorcycleMotion = readWorkspaceFile("front/www/js/map/utils/map.motorcycle.motion.js");
  const motorcycleRenderer = readWorkspaceFile("front/www/js/map/ui/map.motorista.renderer.js");
  const driverMap = readWorkspaceFile("front-driver/www/js/modules/map.js");
  const driverMotion = readWorkspaceFile("front-driver/www/js/modules/map.motion.js");
  const driverGps = readWorkspaceFile("front-driver/www/js/modules/gps.js");
  const mapMotionCss = readWorkspaceFile("front/www/css/components/map-motion.css");
  const mapLayoutCss = readWorkspaceFile("front/www/css/busqueda/busqueda.css");
  const passengerIndex = readWorkspaceFile("front/www/index.html");
  const driverRuntime = readWorkspaceFile("front-driver/www/js/core/native-runtime-loader.js");
  const passengerCss = readWorkspaceFile("front/www/css/main.css");

  assert.match(geo, /export function ocultarOrigenEnMapa/);
  assert.match(geo, /function origenDebeOcultarse\(\)\s*{\s*return \["llego", "en_curso"\]\.includes\(viajeState\.estado\);\s*}/);
  assert.match(geo, /renderPasajeroMarker[\s\S]*ocultarOrigenEnMapa\(\)/);
  assert.match(iniciado, /ocultarOrigenEnMapa\(\)/);
  assert.match(llego, /ocultarOrigenEnMapa\(\)/);
  assert.match(track, /\["llego", "en_curso"\]\.includes\(estadoFinal\)[\s\S]*ocultarOrigenEnMapa\(\)/);
  assert.match(sync, /\["llego", "en_curso"\]\.includes\(data\.estado\)[\s\S]*ocultarOrigenEnMapa\(\)/);

  assert.match(routeRenderer, /export function consumirRutaDesde/);
  assert.match(routeRenderer, /proyectarEnRuta/);
  assert.match(routeRenderer, /actualizarPolylineCoords/);
  assert.match(routeRenderer, /rutaActualLayer\._outline\.setLatLngs/);
  assert.match(routeRenderer, /limpiarRuta\(map\);\s*rutaActualCoords = coordsNormalizados;/);
  assert.doesNotMatch(routeController, /CAMBIO DE FASE[\s\S]{0,220}limpiarRutas\(false\);/);

  assert.match(mapSingleton, /updateWhenIdle:\s*false/);
  assert.match(mapSingleton, /updateWhenZooming:\s*true/);
  assert.match(mapSingleton, /updateInterval:\s*16/);
  assert.match(mapSingleton, /keepBuffer:\s*8/);
  assert.match(mapSingleton, /basemaps\.cartocdn\.com\/dark_all/);
  assert.equal((mapSingleton.match(/L\.tileLayer\(/g) || []).length, 1);
  assert.match(mapSingleton, /ensureRotatingPanes\(mapInstance\)/);
  assert.match(mapSingleton, /\[tilePane, overlayPane\]\.forEach/);
  assert.match(mapSingleton, /rotatePane\.appendChild\(pane\)/);
  assert.match(mapSingleton, /rotatePane\.insertBefore\(surface, rotatePane\.firstChild\)/);
  assert.match(mapSingleton, /preferCanvas:\s*false/);
  assert.match(mapSingleton, /function createLockedRouteRenderer/);
  assert.match(mapSingleton, /L\.svg\(\{ padding:\s*1 \}\)/);
  assert.match(mapSingleton, /delete events\.rotate/);
  assert.match(mapSingleton, /zoomAnimation:\s*true/);
  assert.match(mapSingleton, /fadeAnimation:\s*false/);
  assert.match(mapSingleton, /markerZoomAnimation:\s*true/);
  assert.match(mapSingleton, /inertia:\s*false/);
  assert.match(mapSingleton, /bindViewportRefresh/);
  assert.match(mapSingleton, /orientationchange/);
  assert.match(mapSingleton, /invalidateSize\(\{ animate:\s*false, pan:\s*false \}\)/);
  assert.doesNotMatch(mapSingleton, /eachLayer\([\s\S]{0,180}layer\.redraw/);
  assert.match(passengerIndex, /\.\/vendor\/leaflet\/leaflet\.js\?v=1\.9\.4/);
  assert.match(passengerIndex, /\.\/vendor\/leaflet\/leaflet-rotate\.js\?v=0\.2\.8/);
  assert.match(driverRuntime, /\.\/vendor\/leaflet\/leaflet\.js\?v=1\.9\.4/);
  assert.match(driverRuntime, /\.\/vendor\/leaflet\/leaflet-rotate\.js\?v=0\.2\.8/);
  assert.match(motorcycleMotion, /onMove\s*=\s*null/);
  assert.match(motorcycleMotion, /setMarkerPosition\(marker, next, onMove\)/);
  assert.match(motorcycleRenderer, /onMove:\s*\(position\)\s*=>\s*\{\s*consumirRutaDesde\(map, position\);\s*followMotorista\(map, position\);\s*\}/);
  assert.match(driverMotion, /onMove\s*=\s*null/);
  assert.match(driverGps, /onMove:\s*\(position\)\s*=>\s*consumirRutaDesde\(position\)/);
  assert.match(driverMap, /map\.panTo\(\[center\.lat, center\.lng\]/);
  assert.doesNotMatch(driverMap, /const nextZoom\s*=\s*Math\.max/);
  assert.match(driverMap, /inertia:\s*false/);
  assert.match(driverMap, /updateInterval:\s*16/);
  assert.match(mapMotionCss, /\.leaflet-zoom-anim \.leaflet-zoom-animated[\s\S]*transition:\s*transform 250ms/);
  assert.doesNotMatch(mapMotionCss, /\.leaflet-zoom-animated[\s\S]{0,180}transition:\s*none\s*!important/);
  assert.match(mapMotionCss, /background:\s*#101318\s*!important/);
  assert.match(mapMotionCss, /\.bego-map-surface[\s\S]*background:\s*#101318/);
  assert.match(mapLayoutCss, /\.route-home #map \.bego-map-primary-tiles[\s\S]*grayscale\(1\)/);
  assert.match(routeRenderer, /color:\s*"#e5e7eb"/);
  assert.match(passengerCss, /\.bego-map-icon-moto[\s\S]*transition:\s*none/);
});

test("aviso de llegada: usa componente premium accesible y sin estilos inline", () => {
  const arrivalUi = readWorkspaceFile("front/www/js/pasajero/ui/notificaciones/llegada.ui.js");
  const arrivalCss = readWorkspaceFile("front/www/css/components/arrival.css");

  assert.match(arrivalUi, /className\s*=\s*"arrival-notice"/);
  assert.match(arrivalUi, /aria-live",\s*"assertive"/);
  assert.match(arrivalUi, /arrival-notice__close/);
  assert.match(arrivalUi, /arrival-state/);
  assert.doesNotMatch(arrivalUi, /style="/);
  assert.match(arrivalCss, /\.arrival-notice__card/);
  assert.match(arrivalCss, /env\(safe-area-inset-bottom/);
  assert.match(arrivalCss, /@media \(prefers-reduced-motion:\s*reduce\)/);
});

test("landing: los iconos criticos estan integrados y no dependen de Boxicons", () => {
  const landing = readWorkspaceFile("front/www/landing.html");
  const icons = readWorkspaceFile("front/www/modules/landing/icons.js");
  const header = readWorkspaceFile("front/www/modules/landing/header.js");
  const downloads = readWorkspaceFile("front/www/modules/downloads/downloads.module.js");
  const support = readWorkspaceFile("front/www/modules/soporte/soporte.module.js");

  assert.doesNotMatch(landing, /boxicons/i);
  assert.match(icons, /android:/);
  assert.match(icons, /instagram:/);
  assert.match(icons, /tiktok:/);
  assert.match(header, /renderLandingIcon\("menu"/);
  assert.match(downloads, /renderLandingIcon\(app\.icon/);
  assert.doesNotMatch(support, /class="bx /);
});

test("motorista: no decide la vuelta y queda esperando durante retorno pendiente", () => {
  const driverIdaVuelta = readWorkspaceFile("front-driver/www/js/modules/idaVuelta/idaVuelta.driver.js");
  const driverUi = readWorkspaceFile("front-driver/www/js/modules/viajeControl/viajeUI.js");
  const driverFinalizar = readWorkspaceFile("front-driver/www/js/modules/viajeFinalizar.js");

  assert.match(driverIdaVuelta, /ida-vuelta:pendiente/);
  assert.match(driverIdaVuelta, /Esperando la decision del pasajero/);
  assert.match(driverIdaVuelta, /La vuelta se inicia automaticamente/);
  assert.doesNotMatch(driverIdaVuelta, /socketRef\.emit\(\s*"ida-vuelta:(?:iniciar|anular)-retorno"/);

  assert.match(driverUi, /estadoIdaVuelta === "retorno_pendiente"/);
  assert.match(driverUi, /En attente de la decision du passager/);
  assert.match(driverUi, /btnIniciarVuelta\) btnIniciarVuelta\.style\.display = "none"/);
  assert.match(driverUi, /btnAnularVuelta\) btnAnularVuelta\.style\.display = "none"/);

  assert.match(driverFinalizar, /socket\.on\("ida-vuelta:pendiente", onRetornoPendiente\)/);
  assert.match(driverFinalizar, /limpiarTimerFinalizacion\(viajeId\)/);
});

test("proximidad de viaje: usa GPS fresco como respaldo ante posiciones cacheadas", () => {
  const proximity = readWorkspaceFile("Back/src/services/tripProximity.service.js");

  assert.match(proximity, /obtenerPosicionesMotorista\(motoristaId, fallbackPosition\)/);
  assert.match(proximity, /leerPosicionRedisJson/);
  assert.match(proximity, /leerPosicionRedisHash/);
  assert.match(proximity, /normalizarPunto\(fallbackPosition\)/);
  assert.match(proximity, /filter\(\(item\) => item\.distanciaMetros <= maxDistanceMeters\)/);
  assert.match(proximity, /sort\(\(a, b\) => a\.distanciaMetros - b\.distanciaMetros\)\[0\]/);
  assert.match(proximity, /POSITION_MAX_AGE_MS/);
});
