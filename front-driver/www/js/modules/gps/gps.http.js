import {
  getDriverAccessToken,
  refreshDriverAccessToken
} from "../../auth/session.js";

export async function patchDriverLocation(position, source) {
  let token = getDriverAccessToken();
  let response = await requestDriverLocation(position, token, source);

  if (response.status === 401) {
    token = await refreshDriverAccessToken(getServerUrl());
    response = await requestDriverLocation(position, token, source);
  }

  return response;
}

export function getServerUrl() {
  return typeof window.getServerUrl === "function"
    ? window.getServerUrl().replace(/\/$/, "")
    : window.location.origin.replace(/\/$/, "");
}

function requestDriverLocation({ lat, lng, heading }, token, source) {
  return fetch(`${getServerUrl()}/api/users/driver-location`, {
    method: "PATCH",
    headers: {
      "Authorization": `Bearer ${token || ""}`,
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true"
    },
    body: JSON.stringify({
      lat,
      lng,
      heading,
      disponible: true,
      source
    }),
    keepalive: true
  });
}
