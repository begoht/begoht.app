import { getServerUrl } from "./conexion.js";

let token = localStorage.getItem("token");

if (token?.startsWith('"') && token.endsWith('"')) {
  token = token.slice(1, -1);
}

const socket = io(getServerUrl(), {
  auth: { token },
  transports: ["websocket"],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 10000,
  randomizationFactor: 0.5,
  timeout: 30000,
  autoConnect: true
});

window.begoMonitorSocket?.(socket, { source: "passenger", channel: "legacy" });

export default socket;
