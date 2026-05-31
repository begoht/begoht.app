import { getServerUrl } from "./conexion.js";

let token = localStorage.getItem("token");

if (token?.startsWith('"') && token.endsWith('"')) {
  token = token.slice(1, -1);
}

const socket = io(getServerUrl(), {
  auth: { token },
  transports: ["websocket"],
  autoConnect: true
});

export default socket;
