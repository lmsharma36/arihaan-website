import React from "react";
import { Link } from "react-router-dom";
import "../styles/Footer.css";

const Footer = () => {
  const handleFooterNavigation = (event) => {
    const linkElement = event.target.closest("a");
    if (!linkElement) return;

    const href = linkElement.getAttribute("href") || "";
    if (!href.startsWith("/")) return;

    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  };

  return (
    <footer className="footer" onClick={handleFooterNavigation}>
      <div className="footer-content">
        <div className="footer-about">
          <h3>
            ARIHAAN <span>ENTERPRISES</span>
          </h3>
          <p>
            India's trusted safety equipment supplier committed to workplace
            safety. We provide certified, high-quality personal protective
            equipment from world's leading brands.
          </p>
          <p className="footer-tagline">Protecting Lives. Building Trust.</p>
        </div>

        <div className="footer-section">
          <h4>Quick Links</h4>
          <ul>
            <li>
              <Link to="/">Home</Link>
            </li>
            <li>
              <Link to="/products">Products</Link>
            </li>
            <li>
              <Link to="/brands">Brands</Link>
            </li>
            <li>
              <Link to="/industries">Industries</Link>
            </li>
            <li>
              <Link to="/about">About Us</Link>
            </li>
            <li>
              <Link to="/contact">Contact</Link>
            </li>
          </ul>
        </div>

        <div className="footer-section">
          <h4>Product Categories</h4>
          <div className="footer-categories-columns">
            <div className="col">
              <ul>
                <li>
                  <Link to="/products?category=head-hearing-protection">
                    Head & Hearing
                  </Link>
                </li>
                <li>
                  <Link to="/products?category=eye-face-protection">
                    Eye & Face
                  </Link>
                </li>
                <li>
                  <Link to="/products?category=respiratory-protection">
                    Respiratory
                  </Link>
                </li>
                <li>
                  <Link to="/products?category=hand-arm-protection">
                    Hand & Arm
                  </Link>
                </li>
                <li>
                  <Link to="/products?category=protective-clothing">
                    Protective Clothing
                  </Link>
                </li>
                <li>
                  <Link to="/products?category=safety-footwear">
                    Safety Footwear
                  </Link>
                </li>
              </ul>
            </div>

            <div className="col-divider" aria-hidden="true" />

            <div className="col">
              <ul>
                <li>
                  <Link to="/products?category=fall-protection">
                    Fall Protection
                  </Link>
                </li>
                <li>
                  <Link to="/products?category=traffic-safety-signage">
                    Traffic Safety & Signage
                  </Link>
                </li>
                <li>
                  <Link to="/products?category=confined-space-equipment">
                    Confined Space Equipment
                  </Link>
                </li>
                <li>
                  <Link to="/products?category=fire-safety">Fire Safety</Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="footer-section">
          <h4>Contact Info</h4>
          <ul>
            <li>📞 +91 92270 53200</li>
            <li>✉️ sales@arihaanenterprises.com</li>
            <li>GSTIN: 24MDBPS1939J1Z3</li>
            <li>UDYAM Reg No: UDYAM-GJ-01-0433050</li>
            <li>
              14TH FLOOR, B-1 1403, SANGATH PURE,
              <br />
              NEAR ZUNDAL CIRCLE, CHANDKHEDA,
              <br />
              Ahmedabad, Gujarat - 382424
              <br />
              <a
                href="https://www.google.com/maps/place/SANGATH+PURE,+Zundal,+Chandkheda,+Ahmedabad,+Gujarat+382424"
                target="_blank"
                rel="noopener noreferrer"
              >
                📍 Open in Google Maps
              </a>
            </li>
            <li>
              <Link to="/contact">Get in Touch</Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; 2026 ARIHAAN ENTERPRISES. All rights reserved.</p>
        <p>Trusted supplier of 3M, Honeywell, Ansell, Udyogi, Karam, Dräger</p>
      </div>
    </footer>
  );
};

export default Footer;
