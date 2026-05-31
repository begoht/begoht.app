const router = require("express").Router();
const authCtrl = require("../controllers/auth.controller");

// Registro
router.post("/register", authCtrl.register);

// Login
router.post("/login", authCtrl.login);

// Refresh
router.post("/refresh", authCtrl.refresh);

module.exports = router;
