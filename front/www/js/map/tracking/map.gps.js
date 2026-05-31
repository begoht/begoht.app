let watchId = null;

/*************************************************
 * 📍 GPS INICIAL
 *************************************************/
export function getCurrentPosition(options = {}) {

  return new Promise((resolve, reject) => {

    if (!navigator.geolocation) {
      reject(new Error("Geolocation no soportada"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      resolve,
      reject,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        ...options
      }
    );
  });
}

/*************************************************
 * 🛰️ WATCH POSITION
 *************************************************/
export function startGPSWatch(onUpdate, onError) {

  stopGPSWatch();

  watchId = navigator.geolocation.watchPosition(
    onUpdate,
    onError,
    {
      enableHighAccuracy: true,
      maximumAge: 3000,
      timeout: 10000
    }
  );

  return watchId;
}

/*************************************************
 * 🛑 STOP GPS
 *************************************************/
export function stopGPSWatch() {

  if (watchId !== null) {

    navigator.geolocation.clearWatch(watchId);

    watchId = null;
  }
}