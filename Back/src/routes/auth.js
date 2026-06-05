const express = require("express");
const router = express.Router();

const authController = require("../controllers/auth.controller");
const {
  authLimiter,
  registerLimiter,
  refreshLimiter,
} = require("../middleware/rateLimits");

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
