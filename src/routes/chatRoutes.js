const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");

router.post("/sessions", chatController.createSession);
router.get("/sessions", chatController.getAllSessions);
router.patch("/sessions/:id", chatController.updateSession);
router.get("/sessions/:id/messages", chatController.getMessages);
router.post("/sessions/:id/messages", chatController.sendMessage);
router.delete("/sessions/:id", chatController.removeSession);

module.exports = router;