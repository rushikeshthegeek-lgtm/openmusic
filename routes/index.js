const express = require("express");
const router = express.Router();

const home = require("../controllers/home.controller");

router.get("/", home.index);
router.get("/api/home", home.sweetHome);

router.get("/api/search", home.apiSearch);
router.post("/download", home.download);
router.get("/stream/:id", home.stream);
router.get("/stream/video/:id", home.streamVideo);
router.get("/stream/video/formats/:id", home.videoFormats);
router.get("/stream/video/format/:id/:format", home.streamVideoFormat);

module.exports = router;