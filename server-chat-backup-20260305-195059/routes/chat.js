// routes/chat.js
// Chat routes for AI assistant

const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");

// POST /api/chat - Send message to AI assistant
router.post("/", chatController.sendMessage);

// POST /api/chat/conversation - Multi-turn conversation with context
router.post("/conversation", chatController.conversationWithContext);

// GET /api/chat/suggestions - Get suggestion prompts
router.get("/suggestions", chatController.getSuggestions);

module.exports = router;
