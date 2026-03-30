const express = require("express");
const router = express.Router();
const thresholdController = require("../controllers/thresholdController");

router.get("/", thresholdController.getActive);
router.put("/", thresholdController.update);
router.post("/reset", thresholdController.reset);

module.exports = router;