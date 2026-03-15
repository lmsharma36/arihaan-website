const express = require("express");
const router = express.Router();
const Contact = require("../models/Contact");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");

// @route   POST /api/contact
// @desc    Submit contact form
// @access  Public
router.post("/", async (req, res) => {
  try {
    const { name, email, phone, countryCode, countryName, message } = req.body;

    const contact = await Contact.create({
      name,
      email,
      phone,
      countryCode,
      countryName,
      message,
    });

    res.status(201).json({
      success: true,
      message: "Message sent successfully",
      contact,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   GET /api/contact
// @desc    Get all contacts
// @access  Private/Admin
router.get("/", [auth, admin], async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      count: contacts.length,
      contacts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
