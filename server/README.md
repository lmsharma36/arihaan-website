# 🚀 ARIHAAN ENTERPRISES - Backend API Setup Guide

## 📦 क्या है इस Folder में?

यह **ARIHAAN ENTERPRISES** के लिए complete backend API है।

**Features:**

- ✅ User Registration & Login
- ✅ Product Management (CRUD)
- ✅ Admin Panel Support
- ✅ Contact Form
- ✅ JWT Authentication
- ✅ MongoDB Database
- ✅ Ready to use

---

## 🎯 Step-by-Step Setup (बिल्कुल आसान)

### Step 1: Prerequisites Install करें

#### A. Node.js Install करें (अगर नहीं है तो)

**Download:** https://nodejs.org/  
**Version:** LTS (Recommended)

**Verify installation:**

```bash
node --version
# Should show: v18.x.x या higher

npm --version
# Should show: 9.x.x या higher
```

---

#### B. MongoDB Install करें

**Option 1: Local MongoDB (Recommended for Learning)**

**Windows:**

1. Download: https://www.mongodb.com/try/download/community
2. Install करें (Keep all default settings)
3. MongoDB Compass भी install हो जाएगा (GUI tool)

**Mac:**

```bash
brew install mongodb-community
brew services start mongodb-community
```

**Linux:**

```bash
sudo apt update
sudo apt install mongodb
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

**Verify:**

```bash
mongod --version
# Should show version
```

---

**Option 2: MongoDB Atlas (Cloud - Free)**

1. **Signup:** https://www.mongodb.com/cloud/atlas
2. **Create Free Cluster** (M0 tier)
3. **Create Database User**
4. **Get Connection String**
   - Format: `mongodb+srv://username:password@cluster.mongodb.net/arihaan-ppe`

---

### Step 2: Backend Setup करें

```bash
# 1. Backend folder में जाएं
cd server

# 2. Dependencies install करें
npm install

# यह install करेगा:
# - express (Web framework)
# - mongoose (MongoDB)
# - bcryptjs (Password hashing)
# - jsonwebtoken (Authentication)
# - cors (Cross-origin)
# - dotenv (Environment variables)
```

⏰ **Time:** 2-3 minutes

---

### Step 3: Environment Configuration

```bash
# 1. .env file बनाएं
# Windows:
copy .env.example .env

# Mac/Linux:
cp .env.example .env

# 2. .env file खोलें और edit करें
```

**Local MongoDB के लिए:**

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/arihaan-ppe
JWT_SECRET=arihaan-secret-2026-please-change-this
```

**MongoDB Atlas के लिए:**

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/arihaan-ppe
JWT_SECRET=arihaan-secret-2026-please-change-this
```

⚠️ **Important:** JWT_SECRET को strong password में change करें!

---

### Step 4: Admin User बनाएं

```bash
node createAdmin.js
```

**Output दिखेगा:**

```
✅ Admin user created successfully!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 Email: admin@arihaanenterprises.com
🔑 Password: admin123
👤 Role: admin
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Note:** ये credentials save कर लें!

---

### Step 5: Server Start करें

```bash
# Development mode (auto-restart on file changes)
npm run dev

# या Production mode
npm start
```

**Success Message:**

```
✅ MongoDB Connected: localhost
📊 Database: arihaan-ppe
🚀 Server running on port 5000
📍 API URL: http://localhost:5000
```

---

## 🧪 Testing the API

### 1. Browser में Test करें

Open: http://localhost:5000

**Output:**

```json
{
  "message": "ARIHAAN ENTERPRISES API Server",
  "status": "Running",
  "version": "1.0.0"
}
```

✅ **Working!**

---

### 2. Login Test (Postman या Thunder Client से)

**POST** `http://localhost:5000/api/auth/login`

**Headers:**

```
Content-Type: application/json
```

**Body:**

```json
{
  "email": "admin@arihaanenterprises.com",
  "password": "admin123"
}
```

**Response:**

```json
{
  "success": true,
  "user": {
    "_id": "...",
    "name": "ARIHAAN Admin",
    "email": "admin@arihaanenterprises.com",
    "role": "admin"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Token copy कर लें!** यह बाकी APIs के लिए चाहिए होगा।

---

### 3. Products API Test

**GET** `http://localhost:5000/api/products`

**Response:**

```json
{
  "success": true,
  "count": 0,
  "products": []
}
```

✅ **Working!** (अभी products नहीं हैं, add करेंगे)

---

## 📚 Complete API Documentation

### Authentication APIs

#### 1. Register New User

```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "+91 9999999999",
  "company": "ABC Company"
}
```

#### 2. Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@arihaanenterprises.com",
  "password": "admin123"
}
```

#### 3. Get Current User

```http
GET /api/auth/me
Authorization: Bearer YOUR_TOKEN_HERE
```

---

### Products APIs

#### 1. Get All Products

```http
GET /api/products

# With filters:
GET /api/products?category=head-hearing-protection
GET /api/products?brand=3M
GET /api/products?search=helmet
GET /api/products?minPrice=100&maxPrice=1000
```

#### 2. Get Single Product

```http
GET /api/products/:id
```

#### 3. Create Product (Admin Only)

```http
POST /api/products
Authorization: Bearer YOUR_ADMIN_TOKEN
Content-Type: application/json

{
  "name": "3M Safety Helmet",
  "category": "head-hearing-protection",
  "brand": "3M",
  "description": "Industrial safety helmet...",
  "price": 450,
  "stock": 100,
  "certification": ["ISI", "EN 397"],
  "specifications": {
    "Material": "ABS Plastic",
    "Weight": "350g"
  }
}
```

#### 4. Update Product (Admin Only)

```http
PUT /api/products/:id
Authorization: Bearer YOUR_ADMIN_TOKEN
Content-Type: application/json

{
  "price": 500,
  "stock": 150
}
```

#### 5. Delete Product (Admin Only)

```http
DELETE /api/products/:id
Authorization: Bearer YOUR_ADMIN_TOKEN
```

---

### Contact Form API

#### 1. Submit Contact Form

```http
POST /api/contact
Content-Type: application/json

{
  "name": "Customer Name",
  "email": "customer@email.com",
  "phone": "+91 9999999999",
  "message": "I need 100 safety helmets..."
}
```

#### 2. Get All Contacts (Admin Only)

```http
GET /api/contact
Authorization: Bearer YOUR_ADMIN_TOKEN
```

---

## 📊 Database Structure

### Collections:

1. **users** - All registered users
2. **products** - Product catalog
3. **contacts** - Contact form submissions

### Product Categories:

```javascript
[
  "head-hearing-protection",
  "eye-face-protection",
  "respiratory-protection",
  "hand-arm-protection",
  "protective-clothing",
  "safety-footwear",
  "fall-protection",
  "traffic-safety-signage",
  "confined-space-equipment",
  "fire-safety",
  "miscellaneous",
];
```

### Brands:

```javascript
["3M", "Honeywell", "Ansell", "Udyogi", "Karam", "Drager", "Other"];
```

---

## 🔧 Common Issues & Solutions

### Issue 1: MongoDB Connection Error

```
❌ MongoDB Connection Error: connect ECONNREFUSED
```

**Solution:**

```bash
# Check if MongoDB is running:

# Windows:
services.msc
# Look for "MongoDB Server" - should be "Running"

# Mac:
brew services list
# mongodb-community should show "started"

# Linux:
sudo systemctl status mongodb
# Should show "active (running)"

# Start MongoDB if stopped:
# Windows: services.msc → Start MongoDB Server
# Mac: brew services start mongodb-community
# Linux: sudo systemctl start mongodb
```

---

### Issue 2: Port 5000 Already in Use

```
❌ Error: listen EADDRINUSE: address already in use :::5000
```

**Solution:**

```bash
# Option 1: Change port in .env
PORT=3000

# Option 2: Kill process using port 5000
# Windows:
netstat -ano | findstr :5000
taskkill /PID <PID_NUMBER> /F

# Mac/Linux:
lsof -ti:5000 | xargs kill -9
```

---

### Issue 3: "npm install" Failed

**Solution:**

```bash
# Clear cache
npm cache clean --force

# Delete and reinstall
rm -rf node_modules package-lock.json
npm install
```

---

### Issue 4: Admin Already Exists

```
⚠️ Admin already exists!
```

**This is OK!** Admin already created hai। Login करें existing credentials से।

---

## 🔐 Security Best Practices

### Production में deploy करने से पहले:

1. ✅ **JWT_SECRET change करें** - Strong, random string
2. ✅ **Admin password change करें**
3. ✅ **CORS configure करें** - Specific domains only
4. ✅ **Rate limiting add करें**
5. ✅ **HTTPS enable करें**
6. ✅ **Environment variables secure करें**

---

## 🌐 Connect with React Frontend

### React में API calls:

```javascript
// Base URL set करें
const API_URL = "http://localhost:5000/api";

// Login example
const login = async (email, password) => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  return data;
};

// Get products
const getProducts = async () => {
  const response = await fetch(`${API_URL}/products`);
  const data = await response.json();
  return data.products;
};

// Create product (with auth)
const createProduct = async (productData, token) => {
  const response = await fetch(`${API_URL}/products`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(productData),
  });

  const data = await response.json();
  return data;
};
```

---

## 📁 Project Structure

```
server/
├── config/
│   └── database.js          # MongoDB connection
├── models/
│   ├── User.js              # User schema
│   ├── Product.js           # Product schema
│   ├── Order.js             # Order schema
│   └── Contact.js           # Contact schema
├── routes/
│   ├── auth.js              # Auth routes
│   ├── products.js          # Product routes
│   └── contact.js           # Contact routes
├── middleware/
│   ├── auth.js              # Authentication middleware
│   └── admin.js             # Admin authorization
├── public/
│   └── uploads/
│       └── products/        # Product images
├── .env.example             # Environment template
├── package.json             # Dependencies
├── server.js                # Main server file
├── createAdmin.js           # Admin creation script
└── README.md                # This file
```

---

## 🎯 Quick Commands Reference

```bash
# Install dependencies
npm install

# Start development server (auto-reload)
npm run dev

# Start production server
npm start

# Create admin user
node createAdmin.js

# Check MongoDB status
mongod --version
```

---

## ✅ Checklist - Setup Complete?

- [ ] Node.js installed
- [ ] MongoDB installed/Atlas configured
- [ ] Dependencies installed (`npm install`)
- [ ] `.env` file created and configured
- [ ] Admin user created
- [ ] Server starts without errors
- [ ] API responds at http://localhost:5000
- [ ] Login works in Postman

**All checked?** 🎉 **Backend is ready!**

---

## 🆘 Need Help?

### Debugging Steps:

1. **Check logs** - Terminal में errors देखें
2. **Verify .env** - MONGODB_URI सही है?
3. **Test MongoDB** - `mongod --version` काम करता है?
4. **Check ports** - 5000 free है?
5. **Clear cache** - `npm cache clean --force`

---

## 🚀 Next Steps

1. ✅ Backend चालू रखें (`npm run dev`)
2. ✅ React frontend start करें
3. ✅ Frontend से API calls test करें
4. ✅ Products add करें
5. ✅ Contact form test करें

---

**Backend successfully setup! अब React frontend से connect करें!** 🎉

**Default Admin Credentials:**

- Email: admin@arihaanenterprises.com
- Password: admin123

⚠️ **Production में password जरूर change करें!**
