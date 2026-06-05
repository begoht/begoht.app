const router = require("express").Router();
const authCtrl = require("../controllers/auth.controller");
const {
  authLimiter,
  registerLimiter,
  refreshLimiter,
} = require("../middleware/rateLimits");

// Registro
router.post("/register", registerLimiter, authCtrl.register);

// Login
router.post("/login", authLimiter, authCtrl.login);

// Refresh
router.post("/refresh", refreshLimiter, authCtrl.refresh);

module.exports = router;
