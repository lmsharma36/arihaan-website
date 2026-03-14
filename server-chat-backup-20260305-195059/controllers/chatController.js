// controllers/chatController.js
// Chat controller handling AI assistant requests

const aiService = require("../services/aiService");

class ChatController {
  /**
   * Handle single message to AI assistant
   * POST /api/chat
   */
  async sendMessage(req, res) {
    try {
      const { message } = req.body;

      // Validate input
      if (!message || message.trim() === "") {
        return res.status(400).json({
          success: false,
          message: "Message is required",
        });
      }

      // Check message length
      if (message.length > 1000) {
        return res.status(400).json({
          success: false,
          message: "Message is too long. Please keep it under 1000 characters.",
        });
      }

      // Get AI response
      let aiResponse;
      try {
        aiResponse = await aiService.sendMessage(message);
      } catch (error) {
        // Use fallback if AI service fails
        console.warn("AI service failed, using fallback:", error.message);
        aiResponse = aiService.getFallbackResponse(message);
      }

      // Send response
      res.json({
        success: true,
        message: aiResponse,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Chat controller error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to process your message. Please try again.",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  /**
   * Handle conversation with context (multiple messages)
   * POST /api/chat/conversation
   */
  async conversationWithContext(req, res) {
    try {
      const { conversationHistory } = req.body;

      // Validate input
      if (!conversationHistory || !Array.isArray(conversationHistory)) {
        return res.status(400).json({
          success: false,
          message: "Conversation history must be an array",
        });
      }

      // Validate conversation history format
      const isValid = conversationHistory.every(
        (msg) =>
          msg.role && msg.content && ["user", "assistant"].includes(msg.role),
      );

      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: "Invalid conversation history format",
        });
      }

      // Limit conversation history
      const limitedHistory = conversationHistory.slice(-10); // Keep last 10 messages

      // Get AI response
      let aiResponse;
      try {
        aiResponse = await aiService.sendConversation(limitedHistory);
      } catch (error) {
        // Use fallback if AI service fails
        console.warn("AI service failed, using fallback:", error.message);
        const lastUserMessage = limitedHistory
          .filter((msg) => msg.role === "user")
          .pop();
        aiResponse = aiService.getFallbackResponse(
          lastUserMessage?.content || "",
        );
      }

      // Send response
      res.json({
        success: true,
        message: aiResponse,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Conversation controller error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to process conversation. Please try again.",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  /**
   * Get suggestion prompts for users
   * GET /api/chat/suggestions
   */
  async getSuggestions(req, res) {
    try {
      const suggestions = [
        "What PPE products do you offer?",
        "Which brands do you carry?",
        "What industries do you serve?",
        "How can I get a quote?",
        "Tell me about safety helmets",
        "What certifications do your products have?",
        "Do you offer bulk discounts?",
        "How can I contact your sales team?",
      ];

      res.json({
        success: true,
        suggestions: suggestions,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Suggestions controller error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get suggestions",
      });
    }
  }
}

module.exports = new ChatController();
