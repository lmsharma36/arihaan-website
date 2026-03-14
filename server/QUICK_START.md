# ⚡ ARIHAAN ENTERPRISES Backend - Quick Start

## 🎯 Setup (5 मिनट में)

### 1. Install करें

```bash
cd server
npm install
```

### 2. Environment Setup

```bash
# .env file बनाएं
copy .env.example .env    # Windows
cp .env.example .env      # Mac/Linux

# Edit .env:
# MONGODB_URI=mongodb://localhost:27017/arihaan-ppe
# JWT_SECRET=your-secret-key
```

### 3. Admin बनाएं

```bash
node createAdmin.js
```

### 4. Start करें

```bash
npm run dev
```

✅ **Done! Server चालू:** http://localhost:5000

---

## 🔑 Default Admin Login

```
Email: admin@arihaanenterprises.com
Password: admin123
```

---

## 🧪 Quick Test

### Browser:

```
http://localhost:5000
```

### Postman - Login:

```http
POST http://localhost:5000/api/auth/login

{
  "email": "admin@arihaanenterprises.com",
  "password": "admin123"
}
```

---

## 📚 Main Endpoints

| Endpoint             | Method | Access  |
| -------------------- | ------ | ------- |
| `/api/auth/register` | POST   | Public  |
| `/api/auth/login`    | POST   | Public  |
| `/api/auth/me`       | GET    | Private |
| `/api/products`      | GET    | Public  |
| `/api/products`      | POST   | Admin   |
| `/api/products/:id`  | PUT    | Admin   |
| `/api/products/:id`  | DELETE | Admin   |
| `/api/contact`       | POST   | Public  |
| `/api/contact`       | GET    | Admin   |

---

## 🆘 Problems?

### MongoDB Error?

```bash
# Start MongoDB:
# Windows: services.msc → MongoDB Server → Start
# Mac: brew services start mongodb-community
# Linux: sudo systemctl start mongodb
```

### Port 5000 in use?

```bash
# Change port in .env:
PORT=3000
```

### npm install failed?

```bash
npm cache clean --force
npm install
```

---

## ✅ Checklist

- [ ] Node.js installed
- [ ] MongoDB running
- [ ] npm install done
- [ ] .env configured
- [ ] Admin created
- [ ] Server starts
- [ ] http://localhost:5000 works

**सब ✅?** Ready to use! 🚀
