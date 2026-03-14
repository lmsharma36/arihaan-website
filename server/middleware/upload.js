const multer = require("multer");

const createFileFilter =
  (allowedMimes = []) =>
  (req, file, cb) => {
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
      return;
    }

    cb(new Error(`File type not allowed: ${file.mimetype}`), false);
  };

const MEDIA_ALLOWED_MIMES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
];

const SOURCE_ALLOWED_MIMES = [
  ...MEDIA_ALLOWED_MIMES,
  "text/plain",
  "text/markdown",
  "application/json",
  "application/xml",
  "text/csv",
];

// Create multer instance
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: createFileFilter(MEDIA_ALLOWED_MIMES),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// In-memory uploader for AI draft generation source files.
const sourceUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: createFileFilter(SOURCE_ALLOWED_MIMES),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

module.exports = upload;
module.exports.sourceUpload = sourceUpload;
