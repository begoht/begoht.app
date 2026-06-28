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

  assert.match(passengerSocket, /idaVuelta\.handler\.js\?v=20260628-light-map-locked/);
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

  assert.match(index, /app\.js\?v=20260628-light-map-locked/);
  assert.match(app, /router\.js\?v=20260628-light-map-locked/);
  assert.match(router, /app\.lifecycle\.js\?v=20260628-light-map-locked/);
  assert.match(lifecycle, /pasajero\.main\.js\?v=20260628-light-map-locked/);
  assert.match(passengerMain, /pasajero\.socket\.js\?v=20260628-light-map-locked/);
  assert.match(passengerSocket, /idaVuelta\.handler\.js\?v=20260628-light-map-locked/);
});

test("mapa en viaje: usa una capa, conserva el origen hasta la llegada y rota la ruta unida", () => {
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
  assert.match(mapSingleton, /basemaps\.cartocdn\.com\/light_all/);
  assert.doesNotMatch(mapSingleton, /basemaps\.cartocdn\.com\/dark_/);
  assert.equal((mapSingleton.match(/L\.tileLayer\(/g) || []).length, 1);
  assert.match(mapSingleton, /ensureRotatingPanes\(mapInstance\)/);
  assert.match(mapSingleton, /\[tilePane, overlayPane\]\.forEach/);
  assert.match(mapSingleton, /rotatePane\.appendChild\(pane\)/);
  assert.match(mapSingleton, /rotatePane\.insertBefore\(surface, rotatePane\.firstChild\)/);
  assert.match(mapSingleton, /preferCanvas:\s*false/);
  assert.match(mapSingleton, /L\.svg\(\{ padding:\s*0\.5 \}\)/);
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
  assert.match(motorcycleRenderer, /onMove:\s*\(position\)\s*=>\s*consumirRutaDesde\(map, position\)/);
  assert.match(driverMotion, /onMove\s*=\s*null/);
  assert.match(driverGps, /onMove:\s*\(position\)\s*=>\s*consumirRutaDesde\(position\)/);
  assert.match(driverMap, /map\.panTo\(\[center\.lat, center\.lng\]/);
  assert.doesNotMatch(driverMap, /const nextZoom\s*=\s*Math\.max/);
  assert.match(driverMap, /inertia:\s*false/);
  assert.match(driverMap, /updateInterval:\s*16/);
  assert.match(mapMotionCss, /\.leaflet-zoom-anim \.leaflet-zoom-animated[\s\S]*transition:\s*transform 250ms/);
  assert.doesNotMatch(mapMotionCss, /\.leaflet-zoom-animated[\s\S]{0,180}transition:\s*none\s*!important/);
  assert.match(mapMotionCss, /background:\s*#f2f3f4\s*!important/);
  assert.match(mapMotionCss, /\.bego-map-surface[\s\S]*background:\s*#f2f3f4/);
  assert.match(mapLayoutCss, /\.route-home #map \.bego-map-primary-tiles\s*{\s*filter:\s*none/);
  assert.doesNotMatch(mapLayoutCss, /\.route-home #map[\s\S]{0,500}#3b414b/);
  assert.match(routeRenderer, /color:\s*"#2563eb"/);
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
