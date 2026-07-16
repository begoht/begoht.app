export const DOWNLOAD_VERSION = "20260716-driver-background-gps";
export const PASSENGER_DOWNLOAD_VERSION = "20260705-passenger-header-up";

export const DOWNLOAD_APPS = Object.freeze({
  passenger: Object.freeze({
    id: "passenger",
    file: "bego-pasajero.apk",
    href: `/download/bego-pasajero.apk?v=${PASSENGER_DOWNLOAD_VERSION}`,
    label: "Descargar pasajero",
    shortLabel: "Pasajero",
    analytics: "download_passenger",
    icon: "android"
  }),
  driver: Object.freeze({
    id: "driver",
    file: "bego-motorista.apk",
    href: `/download/bego-motorista.apk?v=${DOWNLOAD_VERSION}`,
    label: "Descargar motorista",
    shortLabel: "Motorista",
    analytics: "download_driver",
    icon: "android"
  })
});

export function getDownloadApp(appId) {
  return DOWNLOAD_APPS[appId] || null;
}
