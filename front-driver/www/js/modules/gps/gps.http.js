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
  const url = `${getServerUrl()}/api/users/driver-location`;
  const headers = {
    "Authorization": `Bearer ${token || ""}`,
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true"
  };
  const body = {
    lat,
    lng,
    heading,
    disponible: true,
    source
  };
  const capacitorHttp = window.Capacitor?.Plugins?.CapacitorHttp;

  if (capacitorHttp?.patch) {
    return capacitorHttp.patch({
      url,
      headers,
      data: body
    }).then((response) => ({
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      json: () => Promise.resolve(response.data)
    }));
  }

  return fetch(url, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
    keepalive: true
  });
}
