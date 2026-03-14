import React, { useState } from "react";
import SeoHead from "../components/SeoHead";
import "../styles/Contact.css";
import { contact } from "../services/api";
import { buildAbsoluteUrl } from "../utils/seo";

const contactStructuredData = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  name: "Contact ARIHAAN ENTERPRISES",
  url: buildAbsoluteUrl("/contact"),
  mainEntity: {
    "@type": "Organization",
    name: "ARIHAAN ENTERPRISES",
    telephone: "+91 92270 53200",
    email: "sales@arihaanenterprises.com",
    address: {
      "@type": "PostalAddress",
      streetAddress:
        "14TH FLOOR, B-1 1403, SANGATH PURE, NEAR ZUNDAL CIRCLE, CHANDKHEDA",
      addressLocality: "Ahmedabad",
      addressRegion: "Gujarat",
      postalCode: "382424",
      addressCountry: "IN",
    },
  },
};

const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const result = await contact.submit(formData);

      if (result.success) {
        setSuccessMessage(
          "Thank you for contacting ARIHAAN ENTERPRISES! We will get back to you soon.",
        );
        setFormData({ name: "", email: "", phone: "", message: "" });
        // Clear success message after 5 seconds
        setTimeout(() => setSuccessMessage(""), 5000);
      } else {
        setErrorMessage(
          result.message || "Failed to submit the form. Please try again.",
        );
      }
    } catch (error) {
      console.error("Error submitting contact form:", error);
      setErrorMessage(
        "An error occurred while submitting the form. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="contact-page">
      <SeoHead
        title="Contact ARIHAAN ENTERPRISES | PPE Quotes and Bulk Orders"
        description="Contact ARIHAAN ENTERPRISES for PPE quotes, bulk orders, safety consultation, and industrial safety equipment supply across India."
        canonicalPath="/contact"
        structuredData={contactStructuredData}
      />

      <section className="page-header">
        <h1>Contact Us</h1>
        <p>Get in touch for quotes, bulk orders, or safety consultation</p>
      </section>

      <section className="contact-content">
        <div className="contact-info">
          <h2>Get In Touch</h2>
          <p>
            Whether you need a small order or bulk supply for your entire
            organization, we're ready to help.
          </p>

          <div className="contact-details">
            <div className="contact-item">
              <a
                className="icon action-icon-link"
                href="tel:+919227053200"
                aria-label="Call +91 92270 53200"
                title="Call +91 92270 53200"
              >
                📞
              </a>
              <div>
                <strong>Phone</strong>
                <p>
                  <a className="contact-value-link" href="tel:+919227053200">
                    +91 92270 53200
                  </a>
                </p>
              </div>
            </div>

            <div className="contact-item">
              <a
                className="icon action-icon-link"
                href="mailto:sales@arihaanenterprises.com"
                aria-label="Email sales@arihaanenterprises.com"
                title="Email sales@arihaanenterprises.com"
              >
                ✉️
              </a>
              <div>
                <strong>Email</strong>
                <p>
                  <a
                    className="contact-value-link"
                    href="mailto:sales@arihaanenterprises.com"
                  >
                    sales@arihaanenterprises.com
                  </a>
                </p>
              </div>
            </div>

            <div className="contact-item">
              <a
                className="icon map-icon-link"
                href="https://www.google.com/maps/place/SANGATH+PURE,+Zundal,+Chandkheda,+Ahmedabad,+Gujarat+382424"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open location in Google Maps"
                title="Open in Google Maps"
              >
                📍
              </a>
              <div>
                <strong>
                  Address{" "}
                  <span className="location-hint">
                    (📍 Click icon for location)
                  </span>
                </strong>
                <p>
                  14TH FLOOR, B-1 1403, SANGATH PURE,
                  <br />
                  NEAR ZUNDAL CIRCLE, CHANDKHEDA,
                  <br />
                  Ahmedabad, Gujarat - 382424
                </p>
              </div>
            </div>

            <div className="contact-item">
              <span className="icon">🕐</span>
              <div>
                <strong>Business Hours</strong>
                <p>
                  Monday - Saturday: 9:00 AM - 6:00 PM
                  <br />
                  Sunday: Closed
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="contact-form-container">
          <h3>Send us a Message</h3>
          {successMessage && (
            <div className="success-message">✓ {successMessage}</div>
          )}
          {errorMessage && (
            <div className="error-message">✕ {errorMessage}</div>
          )}
          <form className="contact-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Your Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Enter your name"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Email Address *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="your@email.com"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Phone Number *</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                placeholder="+91 XXXXX XXXXX"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Your Message *</label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                required
                rows="5"
                placeholder="Tell us about your requirements..."
                disabled={loading}
              ></textarea>
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? "Sending..." : "Send Message"}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
};

export default Contact;
