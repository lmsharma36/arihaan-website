const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const {
  uploadMediaFile,
  getStorageProvider,
} = require("../services/storageService");

const formatStoredFilePayload = (file = {}) => ({
  filename: file.filename,
  key: file.key,
  url: file.url,
  mimetype: file.mimetype,
  size: file.size,
  uploadedAt: file.uploadedAt || new Date().toISOString(),
});

// @route   POST /api/uploads/images
// @desc    Upload product images
// @access  Private/Admin
router.post(
  "/images",
  [auth, admin],
  upload.array("images", 5),
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No files uploaded",
        });
      }

      const storedFiles = await Promise.all(
        req.files.map((file) =>
          uploadMediaFile(file, {
            folder: "products/images",
          }),
        ),
      );
      const fileUrls = storedFiles.map(formatStoredFilePayload);

      res.json({
        success: true,
        message: "Files uploaded successfully",
        provider: getStorageProvider(),
        files: fileUrls,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },
);

// @route   POST /api/uploads/datasheet
// @desc    Upload product datasheet (PDF)
// @access  Private/Admin
router.post(
  "/datasheet",
  [auth, admin],
  upload.single("datasheet"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No file uploaded",
        });
      }

      const storedFile = await uploadMediaFile(req.file, {
        folder: "products/datasheets",
      });
      const fileInfo = formatStoredFilePayload(storedFile);

      res.json({
        success: true,
        message: "File uploaded successfully",
        provider: getStorageProvider(),
        file: fileInfo,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },
);

// @route   POST /api/uploads/image
// @desc    Upload single image
// @access  Private/Admin
router.post(
  "/image",
  [auth, admin],
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No file uploaded",
        });
      }

      const storedFile = await uploadMediaFile(req.file, {
        folder: "products/images",
      });
      const fileInfo = formatStoredFilePayload(storedFile);

      res.json({
        success: true,
        message: "File uploaded successfully",
        provider: getStorageProvider(),
        file: fileInfo,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },
);

module.exports = router;
