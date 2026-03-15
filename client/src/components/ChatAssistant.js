import React, { useState, useRef, useEffect } from "react";
import { FaComments, FaTimes, FaPaperPlane } from "react-icons/fa";
import "../styles/ChatAssistant.css";
import { chat } from "../services/api";

const ChatAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! I'm your AI assistant for ARIHAAN ENTERPRISES. How can I help you today? You can ask me about our products, brands, industries we serve, or any other questions!",
      sender: "bot",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (inputValue.trim() === "") return;

    const userMessage = {
      id: messages.length + 1,
      text: inputValue,
      sender: "user",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages([...messages, userMessage]);
    setInputValue("");
    setIsTyping(true);

    try {
      // Send message to AI backend
      const response = await chat.sendMessage(inputValue);

      const botMessage = {
        id: messages.length + 2,
        text:
          response.message ||
          response.reply ||
          "I apologize, but I couldn't process that request. Please try again.",
        sender: "bot",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMessages((prevMessages) => [...prevMessages, botMessage]);
    } catch (error) {
      console.error("Chat error:", error);

      // Fallback response with intelligent suggestions based on keywords
      const fallbackResponse = generateFallbackResponse(inputValue);

      const botMessage = {
        id: messages.length + 2,
        text: fallbackResponse,
        sender: "bot",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMessages((prevMessages) => [...prevMessages, botMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  // Intelligent fallback responses based on keywords
  const generateFallbackResponse = (userInput) => {
    const input = userInput.toLowerCase();

    // Product-related queries
    if (
      input.includes("product") ||
      input.includes("ppe") ||
      input.includes("safety")
    ) {
      return "We offer a wide range of premium PPE products including safety helmets, gloves, shoes, masks, and protective gear. You can browse our complete catalog in the Products section. Would you like to know about any specific product category?";
    }

    // Brand-related queries
    if (input.includes("brand") || input.includes("manufacturer")) {
      return "ARIHAAN ENTERPRISES partners with top international brands like 3M, Honeywell, MSA, DuPont, and many more. Visit our Brands page to see our complete list of partners. Which brand are you interested in?";
    }

    // Industry-related queries
    if (input.includes("industry") || input.includes("sector")) {
      return "We serve various industries including Construction, Manufacturing, Oil & Gas, Mining, Healthcare, and many more. Each industry has specific safety requirements, and we provide tailored solutions. Which industry are you from?";
    }

    // Pricing queries
    if (
      input.includes("price") ||
      input.includes("cost") ||
      input.includes("quote")
    ) {
      return "For pricing information and quotes, please contact us through our Contact page or call us directly. Our team will provide you with competitive pricing based on your specific requirements and quantity needs.";
    }

    // Contact/Support queries
    if (
      input.includes("contact") ||
      input.includes("support") ||
      input.includes("help") ||
      input.includes("phone") ||
      input.includes("email") ||
      input.includes("address") ||
      input.includes("location") ||
      input.includes("map")
    ) {
      return "You can contact ARIHAAN ENTERPRISES directly here:\n\n• Phone: +91 92270 53200\n• Email: sales@arihaanenterprises.com\n• Address: 14TH FLOOR, B-1 1403, SANGATH PURE, NEAR ZUNDAL CIRCLE, CHANDKHEDA, Ahmedabad, Gujarat - 382424\n• Location: https://www.google.com/maps/place/SANGATH+PURE,+Zundal,+Chandkheda,+Ahmedabad,+Gujarat+382424";
    }

    // Location/Delivery queries
    if (
      input.includes("location") ||
      input.includes("delivery") ||
      input.includes("ship")
    ) {
      return "We are based in India and serve customers nationwide. For delivery and shipping information, please visit our Contact page or reach out to our team for specific delivery timelines to your location.";
    }

    // About company queries
    if (
      input.includes("about") ||
      input.includes("company") ||
      input.includes("who")
    ) {
      return "ARIHAAN ENTERPRISES is a premium PPE supplier committed to providing high-quality safety equipment. We partner with leading international brands to ensure the best protection for your workforce. Visit our About page to learn more about our mission and values.";
    }

    // Greeting responses
    if (
      input.includes("hello") ||
      input.includes("hi") ||
      input.includes("hey")
    ) {
      return "Hello! How can I assist you today? Feel free to ask me about our products, brands, industries, or any other information about ARIHAAN ENTERPRISES.";
    }

    // Thank you responses
    if (input.includes("thank") || input.includes("thanks")) {
      return "You're welcome! Is there anything else I can help you with?";
    }

    // Default response
    return "I'm here to help you with information about ARIHAAN ENTERPRISES, our products, brands, and services. Could you please rephrase your question or ask about:\n\n• Our PPE products\n• Brands we carry\n• Industries we serve\n• Pricing and quotes\n• Contact information\n\nWhat would you like to know?";
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      handleSendMessage(e);
    }
  };

  const renderMessageText = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, index) => {
      if (/^https?:\/\/[^\s]+$/i.test(part)) {
        return (
          <a key={index} href={part} target="_blank" rel="noopener noreferrer">
            {part}
          </a>
        );
      }

      return <React.Fragment key={index}>{part}</React.Fragment>;
    });
  };

  return (
    <div className="chat-assistant">
      {/* Chat Button */}
      <button
        className={`chat-button ${isOpen ? "chat-button-active" : ""}`}
        onClick={toggleChat}
        aria-label="Toggle chat assistant"
      >
        {isOpen ? <FaTimes /> : <FaComments />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="chat-window">
          {/* Chat Header */}
          <div className="chat-header">
            <div className="chat-header-content">
              <FaComments className="chat-header-icon" />
              <div>
                <h3>AI Assistant</h3>
                <span className="chat-status">Online</span>
              </div>
            </div>
            <button
              className="chat-close-btn"
              onClick={toggleChat}
              aria-label="Close chat"
            >
              <FaTimes />
            </button>
          </div>

          {/* Chat Messages */}
          <div className="chat-messages">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`chat-message ${message.sender === "user" ? "user-message" : "bot-message"}`}
              >
                <div className="message-content">
                  <p>{renderMessageText(message.text)}</p>
                  <span className="message-time">{message.timestamp}</span>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="chat-message bot-message">
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <form className="chat-input-container" onSubmit={handleSendMessage}>
            <input
              ref={inputRef}
              type="text"
              className="chat-input"
              placeholder="Type your message..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            <button
              type="submit"
              className="chat-send-btn"
              disabled={inputValue.trim() === ""}
              aria-label="Send message"
            >
              <FaPaperPlane />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ChatAssistant;
