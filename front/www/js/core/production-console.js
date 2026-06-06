(function () {
  const DEBUG_KEY = "bego_debug_console";
  const noop = function () {};

  function storageGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (_) {
      return null;
    }
  }

  function storageSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (_) {}
  }

  function storageRemove(key) {
    try {
      window.localStorage.removeItem(key);
    } catch (_) {}
  }

  const params = new URLSearchParams(window.location.search || "");
  const debugParam = params.get("debugConsole");

  if (debugParam === "1") storageSet(DEBUG_KEY, "1");
  if (debugParam === "0") storageRemove(DEBUG_KEY);

  const hostname = String(window.location.hostname || "").toLowerCase();
  const protocol = String(window.location.protocol || "").toLowerCase();
  const ua = String(window.navigator?.userAgent || "");
  const isDebugEnabled = debugParam === "1" || storageGet(DEBUG_KEY) === "1";
  const isLocalHost = ["localhost", "127.0.0.1", "::1", ""].includes(hostname);
  const isPrivateHost =
    hostname.startsWith("192.168.") ||
    hostname.startsWith("10.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname);
  const isNativeApp =
    protocol === "capacitor:" ||
    protocol === "ionic:" ||
    Boolean(window.Capacitor) ||
    /\bwv\b/i.test(ua);
  const isProductionHost =
    hostname === "bego.com.ht" ||
    hostname === "www.bego.com.ht" ||
    (!isLocalHost && !isPrivateHost);

  if (isDebugEnabled || (!isProductionHost && !isNativeApp)) return;

  window.__BEGO_ORIGINAL_CONSOLE__ = window.__BEGO_ORIGINAL_CONSOLE__ || {
    log: console.log.bind(console),
    info: console.info.bind(console),
    debug: console.debug.bind(console),
    warn: console.warn.bind(console)
  };

  console.log = noop;
  console.info = noop;
  console.debug = noop;
  console.warn = noop;
})();
