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

  assert.match(passengerSocket, /idaVuelta\.handler\.js\?v=20260625-return-cancel/);
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

  assert.match(index, /app\.js\?v=20260625-return-cancel/);
  assert.match(app, /router\.js\?v=20260625-return-cancel/);
  assert.match(router, /app\.lifecycle\.js\?v=20260625-return-cancel/);
  assert.match(lifecycle, /pasajero\.main\.js\?v=20260625-return-cancel/);
  assert.match(passengerMain, /pasajero\.socket\.js\?v=20260625-return-cancel/);
  assert.match(passengerSocket, /idaVuelta\.handler\.js\?v=20260625-return-cancel/);
});

test("mapa en viaje: oculta origen, consume ruta y evita parpadeo al mover o rotar", () => {
  const geo = readWorkspaceFile("front/www/js/map/map.geo.js");
  const iniciado = readWorkspaceFile("front/www/js/socket/handlers/iniciado.handler.js");
  const track = readWorkspaceFile("front/www/js/socket/handlers/track.handler.js");
  const sync = readWorkspaceFile("front/www/js/socket/handlers/sync.handler.js");
  const routeRenderer = readWorkspaceFile("front/www/js/map/ui/map.route.renderer.js");
  const routeController = readWorkspaceFile("front/www/js/map/controllers/map.route.controller.js");
  const mapSingleton = readWorkspaceFile("front/www/js/map/map.singleton.js");
  const passengerCss = readWorkspaceFile("front/www/css/main.css");

  assert.match(geo, /export function ocultarOrigenEnMapa/);
  assert.match(geo, /function origenDebeOcultarse\(\)\s*{\s*return viajeState\.estado === "en_curso";\s*}/);
  assert.match(geo, /renderPasajeroMarker[\s\S]*ocultarOrigenEnMapa\(\)/);
  assert.match(iniciado, /ocultarOrigenEnMapa\(\)/);
  assert.match(track, /estadoFinal === "en_curso"[\s\S]*ocultarOrigenEnMapa\(\)/);
  assert.match(sync, /data\.estado === "en_curso"[\s\S]*ocultarOrigenEnMapa\(\)/);

  assert.match(routeRenderer, /export function consumirRutaDesde/);
  assert.match(routeRenderer, /proyectarEnRuta/);
  assert.match(routeRenderer, /actualizarPolylineCoords/);
  assert.match(routeRenderer, /rutaActualLayer\._outline\.setLatLngs/);
  assert.match(routeRenderer, /limpiarRuta\(map\);\s*rutaActualCoords = coordsNormalizados;/);
  assert.doesNotMatch(routeController, /CAMBIO DE FASE[\s\S]{0,220}limpiarRutas\(false\);/);

  assert.match(mapSingleton, /updateWhenIdle:\s*false/);
  assert.match(mapSingleton, /updateWhenZooming:\s*true/);
  assert.match(mapSingleton, /updateInterval:\s*64/);
  assert.match(mapSingleton, /keepBuffer:\s*6/);
  assert.match(mapSingleton, /bindRotationRefresh/);
  assert.match(passengerCss, /\.bego-map-icon-moto[\s\S]*transition:\s*none/);
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
