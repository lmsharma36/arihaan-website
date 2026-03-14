# 🤖 AI Chat Assistant - Setup Guide

Complete setup guide for running the AI-powered chat assistant with OpenAI backend.

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- OpenAI API key (get from https://platform.openai.com/)

## 🚀 Quick Setup (5 minutes)

### Step 1: Install All Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
npm run install:server
```

Or if you prefer to install concurrently manually:

```bash
npm install --save-dev concurrently
cd server && npm install && cd ..
```

### Step 2: Configure OpenAI

1. **Get your OpenAI API Key:**
   - Visit https://platform.openai.com/
   - Sign up or log in
   - Go to API Keys section
   - Create new secret key
   - Copy the key (starts with `sk-...`)

2. **Configure the backend:**

   ```bash
   # Navigate to server directory
   cd server

   # Create .env file from template
   copy .env.example .env
   ```

3. **Edit server/.env file** and add your API key:

   ```env
   PORT=5000
   NODE_ENV=development
   FRONTEND_URL=http://localhost:3000

   # Replace with your actual OpenAI API key
   OPENAI_API_KEY=sk-your-actual-openai-api-key-here
   OPENAI_MODEL=gpt-3.5-turbo
   ```

### Step 3: Run the Application

**Option A: Run Both Frontend & Backend Together (Recommended)**

```bash
# From root directory
npm run dev
```

This will start:

- React frontend on http://localhost:3000
- Backend API on http://localhost:5000

**Option B: Run Separately**

Terminal 1 (Frontend):

```bash
npm start
```

Terminal 2 (Backend):

```bash
cd server
npm run dev
```

## ✅ Testing the Chat

1. Open http://localhost:3000 in your browser
2. Click the blue chat button in bottom-right corner
3. Type a message: "What products do you offer?"
4. Get AI-powered response!

## 🎯 Sample Questions to Test

Try asking:

- "What PPE products do you sell?"
- "Tell me about 3M safety helmets"
- "Which industries do you serve?"
- "How can I get a quote for bulk orders?"
- "What certifications do your products have?"

## 📁 Project Structure

```
arihaan-react-app/
├── src/                           # React frontend
│   ├── components/
│   │   └── ChatAssistant.js      # Chat UI component
│   ├── services/
│   │   └── api.js                # API integration
│   └── styles/
│       └── ChatAssistant.css     # Chat styling
│
├── server/                        # Node.js backend
│   ├── server.js                 # Express server
│   ├── .env                      # Environment config (create this)
│   ├── controllers/
│   │   └── chatController.js     # Request handlers
│   ├── routes/
│   │   └── chat.js              # API routes
│   └── services/
│       └── aiService.js         # OpenAI integration
│
├── package.json                  # Frontend dependencies
└── GETTING_STARTED.md           # This file
```

## 🔧 Available Scripts

### Frontend

- `npm start` - Run React app (port 3000)
- `npm build` - Build for production
- `npm test` - Run tests

### Backend

- `npm run server` - Run backend (production)
- `npm run server:dev` - Run backend (development with auto-reload)

### Combined

- `npm run dev` - Run both frontend & backend together ⭐
- `npm run install:server` - Install backend dependencies

## 🛠️ Configuration

### Change AI Model

Edit `server/.env`:

```env
# Fast and cheap (recommended)
OPENAI_MODEL=gpt-3.5-turbo

# Better responses (more expensive)
OPENAI_MODEL=gpt-4

# Faster GPT-4
OPENAI_MODEL=gpt-4-turbo-preview
```

### Change Chat Position

Edit `src/styles/ChatAssistant.css`:

```css
.chat-assistant {
  bottom: 20px;
  right: 20px; /* Change to left: 20px for left side */
}
```

### Customize AI Personality

Edit `server/services/aiService.js` - modify the `SYSTEM_PROMPT` constant.

## 🐛 Troubleshooting

### Backend Won't Start

**Error: "Cannot find module"**

```bash
cd server
npm install
```

**Error: "Port 5000 already in use"**

Windows:

```bash
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

Or change port in `server/.env`:

```env
PORT=5001
```

### Chat Not Working

1. **Check backend is running:**
   - Visit http://localhost:5000/health
   - Should see: `{"success": true, "message": "...running"}`

2. **Check OpenAI key:**
   - Verify `OPENAI_API_KEY` in `server/.env`
   - Must start with `sk-`
   - Check you have credits at https://platform.openai.com/

3. **Check Console:**
   - Open browser DevTools (F12)
   - Check Console tab for errors
   - Check Network tab for API calls

### CORS Errors

Verify in `server/.env`:

```env
FRONTEND_URL=http://localhost:3000
```

Must match your React app URL exactly.

## 💰 Cost Information

**OpenAI Pricing (as of 2026):**

- GPT-3.5-Turbo: ~$0.002 per 1000 tokens
- Average message: ~200 tokens
- **Cost per message: ~$0.0004** (less than a cent!)
- 1000 messages: ~$0.40

**Free tier includes:**

- $5 free credits for new accounts
- Good for ~12,500 messages!

Monitor usage: https://platform.openai.com/usage

## 🔄 Fallback Mode

The chat works even without OpenAI! If the API fails:

- ✅ Automatic fallback to smart keyword-based responses
- ✅ Still answers common questions
- ✅ No errors shown to users
- ✅ Seamless experience

## 📦 Production Deployment

### Build Frontend

```bash
npm run build
```

### Deploy Backend

See `server/README.md` for:

- Heroku deployment
- Railway deployment
- Vercel deployment
- Custom server deployment

## 🎨 Customization Ideas

1. **Add Product Recommendations:**
   - Modify `aiService.js` to suggest specific products
   - Integrate with product database

2. **Save Chat History:**
   - Add MongoDB/PostgreSQL
   - Store conversations for analytics

3. **Multi-language Support:**
   - Detect user language
   - Respond in same language

4. **Voice Input/Output:**
   - Add Web Speech API
   - Text-to-speech responses

5. **Lead Capture:**
   - Ask for email during chat
   - Send chat transcript via email

## 📚 Documentation

- **Frontend:** See `CHAT_ASSISTANT_README.md`
- **Backend:** See `server/README.md`
- **API Reference:** `server/README.md#api-endpoints`

## 🎉 You're All Set!

Your AI chat assistant is now ready to help customers 24/7!

**Next Steps:**

1. Customize the AI personality in `server/services/aiService.js`
2. Add your brand colors in `src/styles/ChatAssistant.css`
3. Test with real customer questions
4. Monitor usage on OpenAI dashboard
5. Deploy to production!

---

**Need Help?**

- Check `server/README.md` for detailed backend docs
- Review API endpoints and testing methods
- Check OpenAI status: https://status.openai.com/

**Built for ARIHAAN ENTERPRISES** 🛡️  
Premium PPE Supplier - AI-Powered Customer Support
