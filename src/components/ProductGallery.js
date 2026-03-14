import React, { useState } from "react";
import { getAssetUrl } from "../services/apiConfig";
import "../styles/ProductGallery.css";

const ProductGallery = ({ product }) => {
  const [selectedImage, setSelectedImage] = useState(0);

  // Get available images
  const images =
    product.images && product.images.length > 0
      ? product.images
      : product.mainImage
        ? [product.mainImage]
        : [];

  // Get category icon as fallback
  const categoriesMap = {
    "head-hearing-protection": "🪖",
    "eye-face-protection": "🥽",
    "respiratory-protection": "😷",
    "hand-arm-protection": "🧤",
    "protective-clothing": "👷",
    "safety-footwear": "🥾",
    "fall-protection": "🪂",
    "traffic-safety-signage": "🚦",
    "confined-space-equipment": "⚙️",
    "fire-safety": "🔥",
  };

  const categoryIcon = categoriesMap[product.category] || "🛡️";

  // Helper function to get full URL
  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    return getAssetUrl(imageUrl);
  };

  return (
    <div className="product-gallery">
      {/* Main Image Display */}
      <div className="main-image-container">
        {images.length > 0 ? (
          <img
            src={getImageUrl(images[selectedImage])}
            alt={`${product.name} - ${selectedImage + 1}`}
            className="main-image"
          />
        ) : (
          <div className="main-image icon-placeholder">{categoryIcon}</div>
        )}
      </div>

      {/* Thumbnail Gallery */}
      {images.length > 1 && (
        <div className="thumbnails">
          {images.map((img, idx) => (
            <div
              key={idx}
              className={`thumbnail ${idx === selectedImage ? "active" : ""}`}
              onClick={() => setSelectedImage(idx)}
            >
              <img src={getImageUrl(img)} alt={`Thumbnail ${idx}`} />
            </div>
          ))}
        </div>
      )}

      {/* Datasheet Download Button */}
      {product.datasheet && (
        <div className="datasheet-section">
          <a
            href={getImageUrl(product.datasheet)}
            download
            className="btn-datasheet"
            target="_blank"
            rel="noopener noreferrer"
          >
            📄 Download Datasheet
          </a>
        </div>
      )}
    </div>
  );
};

export default ProductGallery;
