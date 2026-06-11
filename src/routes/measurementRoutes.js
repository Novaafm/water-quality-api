const express = require("express");
const router = express.Router();
const measurementController = require("../controllers/measurementController");

router.post("/start", measurementController.start);
router.post("/stop", measurementController.stop);
router.get("/", measurementController.getAll);
router.get("/:id", measurementController.getById);

module.exports = router;