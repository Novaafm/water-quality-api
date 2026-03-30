const express = require("express");
const router = express.Router();
const sensorController = require("../controllers/sensorController");

router.post("/", sensorController.create);
router.get("/", sensorController.getAll);
router.get("/latest", sensorController.getLatest);
router.get("/stats", sensorController.getStats);
router.get("/export/csv", sensorController.exportCSV);

module.exports = router;