const express = require("express");
const router = express.Router();
const deviceController = require("../controllers/deviceController");

router.post("/", deviceController.create);
router.get("/", deviceController.getAll);
router.get("/:id", deviceController.getById);
router.put("/:id", deviceController.update);
router.delete("/:id", deviceController.remove);

module.exports = router;