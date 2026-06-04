const {
  despacharViajesPendientes = async () => {},
} = require("../services/matching_services/despacho/service.despacho");
const Wallet = require("../models/Wallet");
const Viaje = require("../models/Viaje");
const { getCommissionRate, calculateCommission } = require("../services/commission.service");

exports.finalizarViaje = async (req, res) => {
  try {
    const { viajeId } = req.body;
    if (!viajeId || typeof viajeId !== "string") {
      return res.status(400).json({ error: "viajeId inválido" });
    }

    const viaje = await Viaje.findById(viajeId);
    if (!viaje || viaje.estado !== "en_curso") {
      return res.status(400).json({ error: "Viaje inválido o no en curso" });
    }

    const walletPasajero = await Wallet.findOne({ userId: viaje.pasajero });
    const walletMotorista = await Wallet.findOne({ userId: viaje.motorista });
    if (!walletPasajero || !walletMotorista) {
      return res.status(400).json({ error: "Wallet no encontrada" });
    }

    // 💰 Liquidación
    const total = viaje.precio;
    const commissionRate = await getCommissionRate();
    const comision = calculateCommission(total, commissionRate);
    const pagoMotorista = total - comision;

    walletPasajero.capturar(total, `VIAJE-${viaje._id}`);
    walletMotorista.recargar(pagoMotorista, "ingreso_viaje", `VIAJE-${viaje._id}`);

    viaje.estado = "finalizado";
    viaje.estadoPago = "pagado";
    viaje.comision = comision;
    viaje.pagoMotorista = pagoMotorista;
    viaje.paBeGOrista = pagoMotorista;

    await Promise.all([walletPasajero.save(), walletMotorista.save(), viaje.save()]);

    // 🧠 Reactivar motorista
    if (global.motoristasActivos?.has(viaje.motorista.toString())) {
      const m = global.motoristasActivos.get(viaje.motorista.toString());
      m.disponible = true;
      m.lastUpdate = Date.now();
    }

    // 🔁 Reasignar viajes pendientes automáticamente
    await despacharViajesPendientes();

    res.json({ ok: true, pagoMotorista, paBeGOrista: pagoMotorista, comision });
  } catch (err) {
    console.error("❌ finalizarViaje:", err.message);
    res.status(500).json({ error: err.message });
  }
};
