import React, { useState } from "react";
import { uploads } from "../services/api";
import { getApiBaseUrl } from "../services/apiConfig";
import "../styles/ProductUpload.css";

const API_BASE_URL = getApiBaseUrl();

const saveProductUpdate = async ({ productId, token, payload }) => {
  const isImagesUpdate = Array.isArray(payload?.images);
  const isDatasheetUpdate = typeof payload?.datasheet === "string";
  const updatePath = isImagesUpdate
    ? `${API_BASE_URL}/products/${productId}/images`
    : isDatasheetUpdate
      ? `${API_BASE_URL}/products/${productId}/datasheet`
      : `${API_BASE_URL}/products/${productId}`;

  const response = await fetch(updatePath, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  return {
    success: response.ok && data?.success !== false,
    data,
  };
};

const ProductUpload = ({ productId, onUploadSuccess }) => {
  const [images, setImages] = useState([]);
  const [datasheet, setDatasheet] = useState(null);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [loadingImages, setLoadingImages] = useState(false);
  const [loadingDatasheet, setLoadingDatasheet] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Handle image file selection
  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    setImages(files);

    // Generate previews
    const previews = files.map((file) => URL.createObjectURL(file));
    setImagePreviews(previews);
    setErrorMessage("");
  };

  // Handle datasheet file selection
  const handleDatasheetSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setDatasheet(file);
      setErrorMessage("");
    }
  };

  // Handle drag start on preview item
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  // Handle drag over
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  // Handle drop to reorder
  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    if (draggedIndex === null) return;

    const newImages = [...images];
    const newPreviews = [...imagePreviews];

    // Swap items
    [newImages[draggedIndex], newImages[targetIndex]] = [
      newImages[targetIndex],
      newImages[draggedIndex],
    ];
    [newPreviews[draggedIndex], newPreviews[targetIndex]] = [
      newPreviews[targetIndex],
      newPreviews[draggedIndex],
    ];

    setImages(newImages);
    setImagePreviews(newPreviews);
    setDraggedIndex(null);
  };

  // Handle remove image preview
  const handleRemoveImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
    setImagePreviews(imagePreviews.filter((_, i) => i !== index));
  };

  // Upload images
  const handleUploadImages = async () => {
    if (images.length === 0) {
      setErrorMessage("Please select at least one image");
      return false;
    }

    setLoadingImages(true);
    setErrorMessage("");

    try {
      const token = localStorage.getItem("token");

      // Step 1: Upload files to server
      console.log("Uploading images...");
      const response = await uploads.uploadImages(images, token);
      console.log("Upload response:", response, response.files);

      if (!response.success) {
        setErrorMessage(response.message || "File upload failed");
        setLoadingImages(false);
        return false;
      }

      // Step 2: Save image URLs to product in database
      if (productId && response.files && response.files.length > 0) {
        console.log("Saving image URLs to product:", productId);
        const imageUrls = response.files.map((f) => f.url).filter(Boolean);

        try {
          const saveResult = await saveProductUpdate({
            productId,
            token,
            payload: { images: imageUrls },
          });

          console.log("Save response:", JSON.stringify(saveResult, null, 2));

          if (!saveResult.success) {
            setErrorMessage(
              `Upload OK but save failed: ${saveResult.data?.message || "Unable to update product"}`,
            );
            setLoadingImages(false);
            return false;
          }
        } catch (saveError) {
          console.error("Error saving images to product:", saveError);
          setErrorMessage(`Upload OK but save failed: ${saveError.message}`);
          setLoadingImages(false);
          return false;
        }
      }

      // Step 3: Success!
      setSuccessMessage("✅ Images uploaded and saved successfully!");
      setImages([]);
      setImagePreviews([]);

      // Clear file input
      const input = document.getElementById("image-input");
      if (input) input.value = "";

      // Call callback with uploaded file URLs
      if (onUploadSuccess) {
        onUploadSuccess({
          type: "images",
          files: response.files,
        });
      }

      // Clear message after 3 seconds
      setTimeout(() => setSuccessMessage(""), 3000);
      return true;
    } catch (error) {
      console.error("Unexpected error:", error);
      setErrorMessage(error.message || "Error uploading images");
      return false;
    } finally {
      setLoadingImages(false);
    }
  };

  // Upload datasheet
  const handleUploadDatasheet = async () => {
    if (!datasheet) {
      setErrorMessage("Please select a datasheet file");
      return false;
    }

    if (!datasheet.type.includes("pdf")) {
      setErrorMessage("Only PDF files are allowed for datasheets");
      return false;
    }

    setLoadingDatasheet(true);
    setErrorMessage("");

    try {
      const token = localStorage.getItem("token");

      // Step 1: Upload file to server
      console.log("Uploading datasheet file...");
      const response = await uploads.uploadDatasheet(datasheet, token);
      console.log("Upload response:", response);

      if (!response.success) {
        setErrorMessage(response.message || "File upload failed");
        setLoadingDatasheet(false);
        return false;
      }

      // Step 2: Save datasheet URL to product in database
      if (productId && response.file && response.file.url) {
        console.log(
          "Saving datasheet URL to product:",
          productId,
          response.file.url,
        );
        const datasheetUrl = response.file.url;

        try {
          const saveResult = await saveProductUpdate({
            productId,
            token,
            payload: { datasheet: datasheetUrl },
          });

          console.log("Save response:", JSON.stringify(saveResult, null, 2));

          if (!saveResult.success) {
            setErrorMessage(
              `Upload OK but save failed: ${saveResult.data?.message || "Unable to update product"}`,
            );
            setLoadingDatasheet(false);
            return false;
          }
        } catch (saveError) {
          console.error("Error saving datasheet to product:", saveError);
          setErrorMessage(`Upload OK but save failed: ${saveError.message}`);
          setLoadingDatasheet(false);
          return false;
        }
      }

      // Step 3: Success!
      setSuccessMessage("✅ Datasheet uploaded and saved successfully!");
      setDatasheet(null);

      // Clear file input
      const input = document.getElementById("datasheet-input");
      if (input) input.value = "";

      // Call callback with uploaded file URL
      if (onUploadSuccess) {
        onUploadSuccess({
          type: "datasheet",
          file: response.file,
        });
      }

      // Clear message after 3 seconds
      setTimeout(() => setSuccessMessage(""), 3000);
      return true;
    } catch (error) {
      console.error("Unexpected error:", error);
      setErrorMessage(error.message || "Error uploading datasheet");
      return false;
    } finally {
      setLoadingDatasheet(false);
    }
  };

  const handleUploadAll = async () => {
    if (images.length === 0 && !datasheet) {
      setErrorMessage("Please select image and/or datasheet to upload");
      return;
    }

    setErrorMessage("");
    let imagesOk = true;
    let datasheetOk = true;

    if (images.length > 0) {
      imagesOk = await handleUploadImages();
    }

    if (datasheet && imagesOk) {
      datasheetOk = await handleUploadDatasheet();
    }

    if (imagesOk && datasheetOk) {
      setSuccessMessage("✅ Selected media uploaded successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    }
  };

  return (
    <div className="product-upload">
      <h3>Upload Product Media</h3>

      {successMessage && (
        <div className="upload-message success">{successMessage}</div>
      )}
      {errorMessage && (
        <div className="upload-message error">{errorMessage}</div>
      )}

      {/* Image Upload Section */}
      <div className="upload-section">
        <h4>📷 Product Images</h4>
        <p className="upload-hint">
          Upload up to 5 images (JPG, PNG, GIF, WebP)
        </p>

        <div className="file-input-wrapper">
          <input
            id="image-input"
            type="file"
            multiple
            accept="image/*"
            onChange={handleImageSelect}
            className="file-input"
            disabled={loadingImages}
          />
          <label htmlFor="image-input" className="file-label">
            Choose Images
          </label>
        </div>

        {imagePreviews.length > 0 && (
          <div className="preview-container">
            <p className="preview-label">
              Selected: {imagePreviews.length} image(s) - Drag to reorder
            </p>
            <div className="preview-grid">
              {imagePreviews.map((preview, idx) => (
                <div
                  key={idx}
                  className={`preview-item ${draggedIndex === idx ? "dragging" : ""}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, idx)}
                >
                  <img src={preview} alt={`Preview ${idx}`} />
                  <button
                    type="button"
                    className="remove-preview-btn"
                    onClick={() => handleRemoveImage(idx)}
                    title="Remove this image"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          className="upload-btn primary"
          onClick={handleUploadImages}
          disabled={images.length === 0 || loadingImages}
        >
          {loadingImages ? "Uploading..." : "Upload Images"}
        </button>
      </div>

      {/* Datasheet Upload Section */}
      <div className="upload-section">
        <h4>📄 Product Datasheet (PDF)</h4>
        <p className="upload-hint">
          Upload product datasheet or specifications
        </p>

        <div className="file-input-wrapper">
          <input
            id="datasheet-input"
            type="file"
            accept="application/pdf"
            onChange={handleDatasheetSelect}
            className="file-input"
            disabled={loadingDatasheet}
          />
          <label htmlFor="datasheet-input" className="file-label">
            Choose PDF
          </label>
        </div>

        {datasheet && (
          <div className="selected-file">
            <p>📄 {datasheet.name}</p>
          </div>
        )}

        <button
          type="button"
          className="upload-btn primary"
          onClick={handleUploadDatasheet}
          disabled={!datasheet || loadingDatasheet}
        >
          {loadingDatasheet ? "Uploading..." : "Upload Datasheet"}
        </button>

        <button
          type="button"
          className="upload-btn"
          onClick={handleUploadAll}
          disabled={
            (images.length === 0 && !datasheet) ||
            loadingImages ||
            loadingDatasheet
          }
        >
          Upload All
        </button>
      </div>
    </div>
  );
};

export default ProductUpload;
