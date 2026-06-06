const router = require("express").Router();
const authCtrl = require("../controllers/auth.controller");
const {
  authLimiter,
  emailOtpLimiter,
  emailOtpVerifyLimiter,
  phoneOtpLimiter,
  phoneOtpVerifyLimiter,
  registerLimiter,
  refreshLimiter,
} = require("../middleware/rateLimits");
const emailVerification = require("../controllers/emailVerification.controller");
const phoneVerification = require("../controllers/phoneVerification.controller");

// Verificacion email pasajero
router.post("/email/start", emailOtpLimiter, emailVerification.startPassengerRegistration);
router.post("/email/verify", emailOtpVerifyLimiter, emailVerification.verifyPassengerRegistration);

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
