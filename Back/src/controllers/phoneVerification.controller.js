const {
  requestRegisterOtp,
  verifyRegisterOtp,
} = require("../services/phoneVerification.service");

function getClientIp(req) {
  return req.ip || req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "";
}

function sendError(res, err) {
  const status = err?.status || 500;
  const key = status >= 500 ? "error" : "msg";
  return res.status(status).json({
    ok: false,
    [key]: err?.message || "Error verificando telefono",
    code: err?.code || "PHONE_VERIFICATION_ERROR",
  });
}

function startForRole(rol) {
  return async (req, res) => {
    try {
      const result = await requestRegisterOtp({
        telefono: req.body?.telefono,
        rol,
        ip: getClientIp(req),
        userAgent: req.get("user-agent"),
      });

      return res.json(result);
    } catch (err) {
      if (!err?.status || err.status >= 500) {
        console.error("Phone OTP start error:", err);
      }
      return sendError(res, err);
    }
  };
}

function verifyForRole(rol) {
  return async (req, res) => {
    try {
      const result = await verifyRegisterOtp({
        telefono: req.body?.telefono,
        code: req.body?.code,
        rol,
      });

      return res.json(result);
    } catch (err) {
      if (!err?.status || err.status >= 500) {
        console.error("Phone OTP verify error:", err);
      }
      return sendError(res, err);
    }
  };
}

module.exports = {
  startPassengerRegistration: startForRole("pasajero"),
  verifyPassengerRegistration: verifyForRole("pasajero"),
  startDriverRegistration: startForRole("motorista"),
  verifyDriverRegistration: verifyForRole("motorista"),
};
