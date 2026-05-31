/*************************************************
 * SOCKET – MOTORISTA
const token = localStorage.getItem("token");

if (!token) {
  alert("❌ No hay token, inicia sesión");
  throw new Error("No token");
}

const socket = io("http://localhost:3000", {
  forceNew: true,
  transports: ["websocket"],
  auth: { token },
});

socket.on("connect", () => {
  console.log("🟢 MOTORISTA conectado:", socket.id);
});

socket.on("connect_error", (err) => {
  console.error("❌ Error socket motorista:", err.message);
});

socket.emit("aceptar-viaje", { viajeId });

socket.emit("motorista-posicion", {
  viajeId,
  lat,
  lng,
});

socket.emit("viaje-finalizado", { viajeId });


/*************************************************
 * ENVIAR POSICIÓN CADA 2s

setInterval(() => {
  navigator.geolocation.getCurrentPosition((pos) => {
    socket.emit("motorista-posicion", {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
    });
  });
}, 2000);

*************************************************/