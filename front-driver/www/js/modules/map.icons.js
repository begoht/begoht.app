const NAVIGATION_SIZE = 58;
export const transparentMotoIconUrl = new URL(
  "../../assets/icons/bego-motorista-map.png?v=20260718-bego-moto-clean",
  import.meta.url
).href;

export function crearMotoIcon() {
  if (!window.L?.icon) return null;

  return L.icon({
    iconUrl: transparentMotoIconUrl,
    iconSize: [NAVIGATION_SIZE, NAVIGATION_SIZE],
    iconAnchor: [NAVIGATION_SIZE / 2, NAVIGATION_SIZE / 2],
    popupAnchor: [0, -26],
    className: "bego-map-icon bego-map-icon-navigation"
  });
}

export const motoIcon = crearMotoIcon();
