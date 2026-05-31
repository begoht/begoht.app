const express = require("express");
const router = express.Router();
const { getEnabledCities, getCity } = require("../config/cities");

router.get("/", (req, res) => {
  res.json({
    defaultCity: getCity()?.id || "jacmel",
    cities: getEnabledCities()
  });
});

module.exports = router;
