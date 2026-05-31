const express = require("express");
const router = express.Router();

const authController = require("../controllers/auth.controller");

/*************************************************
 * REGISTER
 *************************************************/
router.post("/register", authController.register);

/*************************************************
 * LOGIN
 *************************************************/
router.post("/login", authController.login);

/*************************************************
 * REFRESH
 *************************************************/
router.post("/refresh", authController.refresh);

module.exports = router;
