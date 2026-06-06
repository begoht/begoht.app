const router = require("express").Router();
const authCtrl = require("../controllers/auth.controller");
const {
  authLimiter,
  phoneOtpLimiter,
  phoneOtpVerifyLimiter,
  registerLimiter,
  refreshLimiter,
} = require("../middleware/rateLimits");
const phoneVerification = require("../controllers/phoneVerification.controller");

// Verificacion telefono pasajero
router.post("/phone/start", phoneOtpLimiter, phoneVerification.startPassengerRegistration);
router.post("/phone/verify", phoneOtpVerifyLimiter, phoneVerification.verifyPassengerRegistration);

// Registro
router.post("/register", registerLimiter, authCtrl.register);

// Login
router.post("/login", authLimiter, authCtrl.login);

// Refresh
router.post("/refresh", refreshLimiter, authCtrl.refresh);

module.exports = router;
