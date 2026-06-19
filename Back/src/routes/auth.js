const express = require("express");
const router = express.Router();

const authController = require("../controllers/auth.controller");
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
const authHttp = require("../middleware/authHttp");

/*************************************************
 * EMAIL VERIFICATION
 *************************************************/
router.post("/email/start", emailOtpLimiter, emailVerification.startPassengerRegistration);
router.post("/email/verify", emailOtpVerifyLimiter, emailVerification.verifyPassengerRegistration);

/*************************************************
 * PHONE VERIFICATION (SMS future)
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
router.post("/logout", authHttp, authController.logout);
router.post("/password/forgot", emailOtpLimiter, emailVerification.startPassengerPasswordReset);
router.post("/password/reset", emailOtpVerifyLimiter, emailVerification.resetPassengerPassword);

module.exports = router;
