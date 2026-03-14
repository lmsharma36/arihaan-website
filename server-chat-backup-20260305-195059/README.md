# AI Chat Assistant Backend

Complete Node.js/Express backend with OpenAI integration for the ARIHAAN ENTERPRISES chat assistant.

## 📋 Features

✅ Express.js REST API server
✅ OpenAI GPT integration (GPT-3.5/GPT-4)
✅ Intelligent fallback responses
✅ CORS enabled for React frontend
✅ Security headers with Helmet
✅ Request logging with Morgan
✅ Error handling middleware
✅ Environment-based configuration
✅ Conversation context support

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# From the root directory
npm run install:server

# Or manually
cd server
npm install
```

### 2. Configure Environment

Create a `.env` file in the `server` directory:

```bash
cd server
# Copy the example environment file
copy .env.example .env
```

Edit `.env` and add your OpenAI API key:

```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Get your API key from https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your-actual-openai-api-key-here
OPENAI_MODEL=gpt-3.5-turbo
```

### 3. Get OpenAI API Key

1. Go to https://platform.openai.com/
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy and paste it into your `.env` file

**Pricing:**

- GPT-3.5-Turbo: ~$0.002 per 1K tokens (very affordable)
- GPT-4: ~$0.03 per 1K tokens (higher quality)

### 4. Start the Backend

**Option A: Run backend only**

```bash
cd server
npm start
```

**Option B: Run backend in development mode (auto-reload)**

```bash
cd server
npm run dev
```

**Option C: Run both frontend and backend together (Recommended)**

```bash
# From root directory
npm run dev
```

The backend will start on http://localhost:5000

## 📁 Project Structure

```
server/
├── server.js                 # Main server file
├── package.json             # Backend dependencies
├── .env                     # Environment variables (create this)
├── .env.example            # Environment template
├── .gitignore              # Git ignore file
├── controllers/
│   └── chatController.js   # Chat request handlers
├── routes/
│   └── chat.js            # API route definitions
└── services/
    └── aiService.js       # OpenAI integration
```

## 🔌 API Endpoints

### Health Check

```http
GET /health
```

Response:

```json
{
  "success": true,
  "message": "ARIHAAN ENTERPRISES AI Backend is running",
  "timestamp": "2026-02-17T10:00:00.000Z"
}
```

### Send Message

```http
POST /api/chat
Content-Type: application/json

{
  "message": "What products do you offer?"
}
```

Response:

```json
{
  "success": true,
  "message": "We offer a comprehensive range of PPE products...",
  "timestamp": "2026-02-17T10:00:00.000Z"
}
```

### Conversation with Context

```http
POST /api/chat/conversation
Content-Type: application/json

{
  "conversationHistory": [
    {"role": "user", "content": "Tell me about safety helmets"},
    {"role": "assistant", "content": "We offer various types..."},
    {"role": "user", "content": "What about 3M helmets?"}
  ]
}
```

### Get Suggestions

```http
GET /api/chat/suggestions
```

Response:

```json
{
  "success": true,
  "suggestions": [
    "What PPE products do you offer?",
    "Which brands do you carry?",
    ...
  ]
}
```

## 🧪 Testing the Backend

### Using cURL

```bash
# Test health endpoint
curl http://localhost:5000/health

# Test chat endpoint
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"What products do you offer?\"}"

# Test suggestions
curl http://localhost:5000/api/chat/suggestions
```

### Using Postman

1. Create a new POST request to `http://localhost:5000/api/chat`
2. Set Headers: `Content-Type: application/json`
3. Set Body (raw JSON):
   ```json
   {
     "message": "Tell me about your safety helmets"
   }
   ```
4. Send the request

### Using Browser

1. Open your React app: http://localhost:3000
2. Click the chat button (bottom-right)
3. Type a message and send
4. The chat will now use the AI backend!

## ⚙️ Configuration Options

### AI Models

In `.env`, you can choose different OpenAI models:

```env
# Fast and affordable (recommended for production)
OPENAI_MODEL=gpt-3.5-turbo

# Higher quality responses (more expensive)
OPENAI_MODEL=gpt-4

# Faster GPT-4 variant
OPENAI_MODEL=gpt-4-turbo-preview
```

### CORS Settings

By default, the backend accepts requests from `http://localhost:3000`. To allow other origins:

```env
# Allow multiple origins (comma-separated)
FRONTEND_URL=http://localhost:3000,https://yourdomain.com
```

### Port Configuration

Change the port in `.env`:

```env
PORT=8000  # Use any available port
```

## 🛡️ Security Features

- **Helmet.js**: Adds security headers
- **CORS**: Configured for your frontend only
- **Input Validation**: Message length and format checks
- **Error Handling**: Graceful error responses
- **Environment Variables**: API keys not exposed in code

## 🔄 Fallback System

The backend includes intelligent fallback responses that activate if:

- OpenAI API is unavailable
- API key is invalid
- Rate limits are exceeded
- Network issues occur

The fallback system provides context-aware responses based on keywords, so your chat assistant always works!

## 📊 Monitoring

### Logs

The server logs all requests using Morgan:

```
GET /health 200 5.123 ms - 89
POST /api/chat 200 1234.567 ms - 156
```

### Error Tracking

Errors are logged to console with full stack traces in development mode:

```javascript
NODE_ENV=development  # Shows detailed errors
NODE_ENV=production   # Shows user-friendly messages only
```

## 🚀 Deployment

### Deploy to Heroku

```bash
# Install Heroku CLI
# Login
heroku login

# Create app
heroku create arihaan-chat-backend

# Set environment variables
heroku config:set OPENAI_API_KEY=your-key
heroku config:set NODE_ENV=production
heroku config:set FRONTEND_URL=https://your-frontend-domain.com

# Deploy
cd server
git init
git add .
git commit -m "Initial commit"
heroku git:remote -a arihaan-chat-backend
git push heroku main
```

### Deploy to Railway

1. Go to https://railway.app/
2. Create new project from GitHub
3. Add environment variables in Railway dashboard
4. Deploy automatically

### Deploy to Vercel (Serverless)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd server
vercel
```

## 🔧 Troubleshooting

### Issue: "OpenAI API Error"

**Solution:**

1. Check your API key in `.env`
2. Verify you have credits in your OpenAI account
3. Check rate limits on OpenAI dashboard
4. The fallback system will activate automatically

### Issue: "CORS Error"

**Solution:**

1. Verify `FRONTEND_URL` in `.env` matches your React app URL
2. Check that backend is running on port 5000
3. Ensure React app API URL is `http://localhost:5000`

### Issue: "Cannot find module"

**Solution:**

```bash
cd server
rm -rf node_modules
rm package-lock.json
npm install
```

### Issue: "Port already in use"

**Solution:**

```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Or change port in .env
PORT=5001
```

## 📝 Customization

### Modify System Prompt

Edit `server/services/aiService.js` to change how the AI responds:

```javascript
const SYSTEM_PROMPT = `Your custom instructions here...`;
```

### Add New Endpoints

1. Create route in `routes/chat.js`
2. Add controller method in `controllers/chatController.js`
3. Implement logic in `services/aiService.js`

### Use Different AI Provider

Replace OpenAI with other providers:

- Anthropic Claude
- Google Gemini
- Hugging Face
- Your own ML model

Just update `services/aiService.js` with the new API integration.

## 💰 Cost Estimation

**GPT-3.5-Turbo costs:**

- Average chat message: ~200 tokens
- Cost per message: ~$0.0004
- 1000 messages: ~$0.40
- 10,000 messages: ~$4.00

**Tips to reduce costs:**

1. Set max_tokens limit (already set to 500)
2. Use GPT-3.5 instead of GPT-4
3. Implement caching for common questions
4. Monitor usage on OpenAI dashboard

## 📚 Additional Resources

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Express.js Guide](https://expressjs.com/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

## 🤝 Support

For issues or questions:

1. Check the troubleshooting section above
2. Review OpenAI API status: https://status.openai.com/
3. Check server logs for detailed error messages

---

**Built for ARIHAAN ENTERPRISES**  
Premium PPE Supplier - AI-Powered Customer Support
