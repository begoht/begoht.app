export const DOWNLOAD_VERSION = "20260624-passenger-install";

export const DOWNLOAD_APPS = Object.freeze({
  passenger: Object.freeze({
    id: "passenger",
    file: "bego-pasajero.apk",
    href: `/download/bego-pasajero.apk?v=${DOWNLOAD_VERSION}`,
    label: "Descargar pasajero",
    shortLabel: "Pasajero",
    analytics: "download_passenger",
    icon: "bx bxl-android"
  }),
  driver: Object.freeze({
    id: "driver",
    file: "bego-motorista.apk",
    href: `/download/bego-motorista.apk?v=${DOWNLOAD_VERSION}`,
    label: "Descargar motorista",
    shortLabel: "Motorista",
    analytics: "download_driver",
    icon: "bx bxl-android"
  })
});

export function getDownloadApp(appId) {
  return DOWNLOAD_APPS[appId] || null;
}
