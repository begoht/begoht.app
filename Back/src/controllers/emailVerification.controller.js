const {
  requestRegisterEmailOtp,
  verifyRegisterEmailOtp,
} = require("../services/emailVerification.service");

function getClientIp(req) {
  return req.ip || req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "";
}

function sendError(res, err) {
  const status = err?.status || 500;
  const key = status >= 500 ? "error" : "msg";
  return res.status(status).json({
    ok: false,
    [key]: err?.message || "Error verificando email",
    code: err?.code || "EMAIL_VERIFICATION_ERROR",
  });
}

function startForRole(rol) {
  return async (req, res) => {
    try {
      const result = await requestRegisterEmailOtp({
        email: req.body?.email,
        rol,
        ip: getClientIp(req),
        userAgent: req.get("user-agent"),
      });

      return res.json(result);
    } catch (err) {
      console.error("Email OTP start error:", err);
      return sendError(res, err);
    }
  };
}

function verifyForRole(rol) {
  return async (req, res) => {
    try {
      const result = await verifyRegisterEmailOtp({
        email: req.body?.email,
        code: req.body?.code,
        rol,
      });

      return res.json(result);
    } catch (err) {
      console.error("Email OTP verify error:", err);
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
