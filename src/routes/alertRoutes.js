const express = require("express");
const router = express.Router();
const alertController = require("../controllers/alertController");

router.get("/", alertController.getAll);
router.patch("/:id/read", alertController.markRead);
router.patch("/read-all", alertController.markAllRead);

module.exports = router;