# File Upload System - Setup Guide

## Overview

Your Arihaan Enterprises app now has a complete file upload system for managing product images and datasheets using **Multer + Local Storage**.

## Backend Setup (Already Configured ✓)

### Files Added:

1. **`middleware/upload.js`** - Multer configuration
   - Handles image & PDF file uploads
   - Max file size: 10MB
   - Allowed formats: JPG, PNG, GIF, WebP, PDF

2. **`routes/uploads.js`** - Upload endpoints
   - `POST /api/uploads/image` - Upload single image
   - `POST /api/uploads/images` - Upload multiple images (max 5)
   - `POST /api/uploads/datasheet` - Upload PDF datasheet

3. **`server.js`** - Updated to include upload routes

### File Storage:

- Location: `public/uploads/`
- Protected endpoint: `/uploads/{filename}`
- Files served via: `http://localhost:5000/uploads/{filename}`

---

## Frontend Components (Already Created ✓)

### 1. **ProductUpload.js** - Admin Upload Form

- Drag-and-drop file selection
- Image preview grid
- Upload progress indicators
- Error/success messages
- Handles both single images and batches

### 2. **ProductGallery.js** - Product Display

- Displays uploaded images in a gallery
- Thumbnail selection
- PDF datasheet viewer modal
- Fallback to category icons if no images

### 3. **API Integration** - `services/api.js`

- `uploads.uploadImage(file, token)` - Single image
- `uploads.uploadImages(files, token)` - Multiple images
- `uploads.uploadDatasheet(file, token)` - PDF upload

---

## How to Use

### For Admins:

1. Navigate to any product detail page
2. Scroll to "Admin Panel" section (visible only for admins)
3. Click "Upload Media" button
4. Select images or PDF
5. Click "Upload" to save files
6. Files will be stored and associated with the product

```
Admin Status:
- User must be logged in with role: "admin"
- Role is read from localStorage['user']
```

### Database Schema:

Update your Product model to store file URLs:

```javascript
{
  name: String,
  images: [String],           // Array of image URLs
  mainImage: String,          // Primary image URL
  datasheet: String,          // PDF datasheet URL
  // ... other fields
}
```

---

## API Endpoints

### Upload Single Image

```
POST /api/uploads/image
Authorization: Bearer {token}
Content-Type: multipart/form-data

Form Data:
- image: File

Response:
{
  success: true,
  message: "File uploaded successfully",
  file: {
    filename: "1708XXX-product.jpg",
    url: "/uploads/1708XXX-product.jpg",
    mimetype: "image/jpeg",
    size: 245000,
    uploadedAt: "2026-02-15T..."
  }
}
```

### Upload Multiple Images

```
POST /api/uploads/images
Authorization: Bearer {token}
Content-Type: multipart/form-data

Form Data:
- images: File[] (max 5 files)

Response:
{
  success: true,
  message: "Files uploaded successfully",
  files: [
    { filename, url, mimetype, size, uploadedAt },
    { filename, url, mimetype, size, uploadedAt }
  ]
}
```

### Upload Datasheet

```
POST /api/uploads/datasheet
Authorization: Bearer {token}
Content-Type: multipart/form-data

Form Data:
- datasheet: File (PDF only)

Response:
{
  success: true,
  message: "File uploaded successfully",
  file: { filename, url, mimetype, size, uploadedAt }
}
```

---

## Directory Structure

```
server/
├── middleware/
│   └── upload.js          ← NEW: Multer config
├── public/
│   └── uploads/           (Files stored here)
├── routes/
│   ├── auth.js
│   ├── products.js
│   ├── contact.js
│   └── uploads.js         ← NEW: Upload endpoints
└── server.js              (Updated)

arihaan-react-app/
├── src/
│   ├── components/
│   │   ├── ProductUpload.js     ← NEW: Upload form
│   │   └── ProductGallery.js    ← NEW: Image gallery
│   ├── pages/
│   │   └── ProductDetail.js     (Updated)
│   ├── services/
│   │   └── api.js               (Updated)
│   └── styles/
│       ├── ProductUpload.css    ← NEW
│       ├── ProductGallery.css   ← NEW
│       └── ProductDetail.css    (Updated)
```

---

## Future Enhancements

### MongoDB GridFS (Optional)

To store large files directly in MongoDB instead of local storage:

1. Install: `npm install multer-gridfs-storage`
2. Replace disk storage with GridFS storage
3. Update routes to stream from MongoDB
4. Benefit: Scalable, database-backed storage

### AWS S3 (Optional)

For production deployment:

1. Install: `npm install aws-sdk multer-s3`
2. Configure AWS credentials
3. Update storage to S3
4. Access files via CloudFront

---

## Testing

### Test Upload via cURL:

```bash
# Upload single image
curl -X POST http://localhost:5000/api/uploads/image \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@/path/to/image.jpg"

# Upload multiple images
curl -X POST http://localhost:5000/api/uploads/images \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "images=@image1.jpg" \
  -F "images=@image2.jpg"

# Upload datasheet
curl -X POST http://localhost:5000/api/uploads/datasheet \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "datasheet=@product.pdf"
```

---

## Troubleshooting

**Issue:** Uploaded files not accessible

- Check: `public/uploads/` directory exists
- Check: Backend is running and file served at `/uploads/{filename}`
- Check: API token is valid (admin only)

**Issue:** 413 Payload Too Large

- Increase limit in `middleware/upload.js`: `fileSize: 50 * 1024 * 1024`

**Issue:** File type rejected

- Allowed types: `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `application/pdf`
- Add more in `fileFilter` function if needed

---

## Next Steps

1. Test uploading images via the admin panel
2. Verify files appear in `public/uploads/`
3. Check image URLs work in product gallery
4. Test PDF datasheet viewer modal
5. Consider migrating to MongoDB GridFS or S3 for production
