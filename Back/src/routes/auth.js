const express = require("express");
const router = express.Router();

const authController = require("../controllers/auth.controller");
const {
  authLimiter,
  phoneOtpLimiter,
  phoneOtpVerifyLimiter,
  registerLimiter,
  refreshLimiter,
} = require("../middleware/rateLimits");
const phoneVerification = require("../controllers/phoneVerification.controller");

/*************************************************
 * PHONE VERIFICATION
 *************************************************/
router.post("/phone/start", phoneOtpLimiter, phoneVerification.startPassengerRegistration);
router.post("/phone/verify", phoneOtpVerifyLimiter, phoneVerification.verifyPassengerRegistration);

/*************************************************
 * REGISTER
 *************************************************/
router.post("/register", registerLimiter, authController.register);

/*************************************************
 * LOGIN
 *************************************************/
router.post("/login", authLimiter, authController.login);

/*************************************************
 * REFRESH
 *************************************************/
router.post("/refresh", refreshLimiter, authController.refresh);

module.exports = router;
