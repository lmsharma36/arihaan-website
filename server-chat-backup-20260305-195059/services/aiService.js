// services/aiService.js
// AI Service for chat interactions using OpenAI

const OpenAI = require("openai");

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const CONTACT_DETAILS_RESPONSE = `You can contact ARIHAAN ENTERPRISES directly here:

• Phone: +91 92270 53200
• Email: sales@arihaanenterprises.com
• Address: 14TH FLOOR, B-1 1403, SANGATH PURE, NEAR ZUNDAL CIRCLE, CHANDKHEDA, Ahmedabad, Gujarat - 382424
• Location: https://www.google.com/maps/place/SANGATH+PURE,+Zundal,+Chandkheda,+Ahmedabad,+Gujarat+382424`;

const CONTACT_KEYWORDS = [
  "contact",
  "phone",
  "call",
  "mobile",
  "email",
  "mail",
  "address",
  "location",
  "map",
  "reach",
  "support",
];

const isContactQuery = (text = "") => {
  const input = text.toLowerCase();
  return CONTACT_KEYWORDS.some((keyword) => input.includes(keyword));
};

// System prompt for the AI assistant
const SYSTEM_PROMPT = `You are a professional and helpful AI assistant for ARIHAAN ENTERPRISES, a premium PPE (Personal Protective Equipment) supplier based in India.

Company Information:
- Name: ARIHAAN ENTERPRISES
- Business: Premium PPE supplier and safety equipment provider
- Products: Wide range of safety equipment including helmets, gloves, shoes, masks, protective clothing, and industrial safety gear
- Brands: Partner with top international brands like 3M, Honeywell, MSA, DuPont, Ansell, Kimberly-Clark, and more
- Industries Served: Construction, Manufacturing, Oil & Gas, Mining, Healthcare, Pharmaceuticals, Food Processing, and more

Your Role:
- Provide accurate information about PPE products and their applications
- Help customers understand safety requirements for different industries
- Suggest appropriate products based on customer needs
- Answer questions about brands, specifications, and certifications
- Guide customers on how to contact the company or request quotes
- Be professional, friendly, and knowledgeable about workplace safety

Guidelines:
- Keep responses concise but informative (2-4 sentences preferred)
- For pricing questions, politely direct them to contact the sales team
- For technical specifications, provide general information but suggest contacting for detailed datasheets
- Always prioritize safety and compliance in your recommendations
- If you don't know something specific, be honest and suggest they contact the company directly
- Use a professional yet friendly tone

Remember: You're representing a premium PPE supplier, so maintain professionalism while being helpful and approachable.`;

class AIService {
  /**
   * Send a single message to AI and get response
   * @param {string} message - User message
   * @returns {Promise<string>} - AI response
   */
  async sendMessage(message) {
    try {
      if (isContactQuery(message)) {
        return CONTACT_DETAILS_RESPONSE;
      }

      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: message },
        ],
        temperature: 0.7,
        max_tokens: 500,
        top_p: 1,
        frequency_penalty: 0.3,
        presence_penalty: 0.3,
      });

      return completion.choices[0].message.content;
    } catch (error) {
      console.error("OpenAI API Error:", error);
      throw new Error("Failed to get AI response");
    }
  }

  /**
   * Send conversation with context (multiple messages)
   * @param {Array} conversationHistory - Array of message objects {role, content}
   * @returns {Promise<string>} - AI response
   */
  async sendConversation(conversationHistory) {
    try {
      const lastUserMessage = [...conversationHistory]
        .reverse()
        .find((msg) => msg.role === "user");

      if (isContactQuery(lastUserMessage?.content || "")) {
        return CONTACT_DETAILS_RESPONSE;
      }

      const messages = [
        { role: "system", content: SYSTEM_PROMPT },
        ...conversationHistory,
      ];

      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
        messages: messages,
        temperature: 0.7,
        max_tokens: 500,
        top_p: 1,
        frequency_penalty: 0.3,
        presence_penalty: 0.3,
      });

      return completion.choices[0].message.content;
    } catch (error) {
      console.error("OpenAI API Error:", error);
      throw new Error("Failed to get AI response");
    }
  }

  /**
   * Get fallback response when AI is unavailable
   * @param {string} message - User message
   * @returns {string} - Fallback response
   */
  getFallbackResponse(message) {
    const input = message.toLowerCase();

    if (isContactQuery(input)) {
      return CONTACT_DETAILS_RESPONSE;
    }

    // Product-related queries
    if (
      input.includes("product") ||
      input.includes("ppe") ||
      input.includes("safety")
    ) {
      return "We offer a comprehensive range of premium PPE products including safety helmets, gloves, protective shoes, masks, and complete safety gear. Our products meet international standards and are suitable for various industrial applications. Please visit our Products section or contact us for detailed information about specific items.";
    }

    // Brand-related queries
    if (input.includes("brand") || input.includes("manufacturer")) {
      return "ARIHAAN ENTERPRISES partners with world-renowned brands including 3M, Honeywell, MSA, DuPont, Ansell, and Kimberly-Clark. We ensure all our products are genuine and meet the highest quality standards. Which brand are you interested in learning more about?";
    }

    // Industry-related queries
    if (input.includes("industry") || input.includes("sector")) {
      return "We serve diverse industries including Construction, Manufacturing, Oil & Gas, Mining, Healthcare, Pharmaceuticals, and Food Processing. Each industry has unique safety requirements, and we provide tailored PPE solutions to meet specific compliance standards. What industry are you working in?";
    }

    // Pricing queries
    if (
      input.includes("price") ||
      input.includes("cost") ||
      input.includes("quote")
    ) {
      return "For pricing information and bulk quotes, please contact our sales team through the Contact page or call us directly. We offer competitive pricing based on quantity, specifications, and delivery requirements. Our team will be happy to provide a detailed quotation tailored to your needs.";
    }

    // Contact/Support queries
    // Default response
    return "Thank you for your inquiry! I'm here to help you with information about ARIHAAN ENTERPRISES PPE products, brands, and services. Could you please provide more details about what you're looking for? You can ask about specific products, industries we serve, brands we carry, or how to get in touch with our team.";
  }
}

module.exports = new AIService();
