const mongoose = require("mongoose");

const variantSchema = new mongoose.Schema(
  {
    label: { type: String },
    model: { type: String },
    name: { type: String },
    size: { type: String },
    capacity: { type: String },
    color: { type: String },
    details: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: undefined,
    },
  },
  { _id: false, strict: false },
);

const productSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    brand: {
      type: String,
      required: true,
      index: true,
    },

    images: {
      type: [String],
      default: [],
    },

    datasheet: {
      type: String,
      default: "",
    },

    category: {
      type: String,
      required: true,
      index: true,
    },

    hsn: {
      type: String,
    },

    tax: {
      gst_rate: {
        type: Number,
        default: 18,
      },
    },

    variants: [variantSchema],

    pricing: {
      price_type: {
        type: String,
        default: "price_on_request",
      },
      display_label: {
        type: String,
        default: "Price on Request",
      },
    },

    active: {
      type: Boolean,
      default: true,
    },

    certification: {
      type: [String],
      default: [],
    },

    specifications: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    strict: true,
    toJSON: { flattenMaps: true },
    toObject: { flattenMaps: true },
  },
);

module.exports = mongoose.model("Product", productSchema, "products");
