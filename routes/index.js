const express = require("express");
const router = express.Router();

const home = require("../controllers/home.controller");

router.get("/", home.index);
router.get("/api/home", home.sweetHome);

router.get("/api/search", home.apiSearch);
router.post("/download", home.download);
router.get("/stream/:id", home.stream);

module.exports = router;