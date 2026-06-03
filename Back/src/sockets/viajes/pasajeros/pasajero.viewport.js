const { redis } = require("../../../config/redis");

module.exports = (io, socket) => {

  let lastViewportTime = 0;
  let lastMotoristasSignature = "";
  let lastMotoristasEmitTime = 0;

  socket.on("viewport-motoristas", async (viewport) => {

    const now = Date.now();
    if (now - lastViewportTime < 500) return;
    lastViewportTime = now;

    try {

      const { north, south, east, west, city } = viewport;

      if (
        north == null ||
        south == null ||
        east == null ||
        west == null
      ) return;

      const centerLat = (north + south) / 2;
      const centerLng = (east + west) / 2;

      const heightKm = Math.abs(north - south) * 111;
      const widthKm =
        Math.abs(east - west) *
        111 *
        Math.cos(centerLat * Math.PI / 180);

      const geoKey = city ? `motoristas:ubicacion:${city}` : "motoristas:ubicacion";

      let ids = await redis.geosearch(
        geoKey,
        "FROMLONLAT",
        centerLng,
        centerLat,
        "BYBOX",
        widthKm,
        heightKm,
        "km"
      );

      if (ids.length > 50) {
        ids = ids.slice(0, 50);
      }

      if (!ids.length) {
        socket.emit("motoristas-cerca", []);
        return;
      }

      const pipeline = redis.pipeline();

      ids.forEach(id => {
        pipeline.hgetall(`motorista:data:${id}`);
      });

      const results = await pipeline.exec();

      const motoristas = [];

      results.forEach(([, data], index) => {
        if (!data) return;
        if (data.disponible !== "true") return;

        motoristas.push({
          id: ids[index],
          lat: parseFloat(data.lat),
          lng: parseFloat(data.lng),
          heading: data.heading !== "" && data.heading != null ? parseFloat(data.heading) : null,
        });
      });

      const signature = crearMotoristasSignature(motoristas);
      const emitNow = Date.now();

      if (
        signature === lastMotoristasSignature &&
        emitNow - lastMotoristasEmitTime < 5000
      ) {
        return;
      }

      lastMotoristasSignature = signature;
      lastMotoristasEmitTime = emitNow;

      socket.emit("motoristas:ubicacion", motoristas);

    } catch (error) {
      console.error("❌ Error viewport-motoristas:", error);
    }

  });

};

function crearMotoristasSignature(motoristas) {
  return (motoristas || [])
    .map((m) => ({
      id: String(m.id || ""),
      lat: Number(m.lat).toFixed(5),
      lng: Number(m.lng).toFixed(5),
      heading: Number.isFinite(Number(m.heading)) ? Math.round(Number(m.heading)) : ""
    }))
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((m) => `${m.id}:${m.lat}:${m.lng}:${m.heading}`)
    .join("|");
}
