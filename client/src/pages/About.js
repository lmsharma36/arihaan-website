import React from "react";
import { Link } from "react-router-dom";
import SeoHead from "../components/SeoHead";
import "../styles/About.css";

const About = () => {
  return (
    <div className="about-page">
      <SeoHead
        title="About ARIHAAN ENTERPRISES | PPE and Industrial Safety Supplier"
        description="Learn about ARIHAAN ENTERPRISES, a trusted supplier of certified PPE and workplace safety equipment for businesses across India."
        canonicalPath="/about"
      />

      <section className="page-header">
        <h1>About ARIHAAN ENTERPRISES</h1>
        <p>Your trusted partner in workplace safety since 2022</p>
      </section>

      <section className="about-content">
        <div className="about-section">
          <h2>Who We Are</h2>
          <p>
            ARIHAAN ENTERPRISES is a leading supplier of Personal Protective
            Equipment (PPE) and safety solutions in India. We supply products
            from world's most trusted brands including 3M, Honeywell, Ansell,
            Karam, Dräger, and Udyogi.
          </p>
          <p>
            With years of experience in the safety industry, we have become the
            preferred choice for businesses across diverse sectors.
          </p>
        </div>

        <div className="about-section">
          <h2>Our Mission</h2>
          <p>
            To provide high-quality, certified safety equipment that protects
            lives and ensures workplace safety across all industries in India.
          </p>
        </div>

        <div className="about-section">
          <h2>Why Choose Us</h2>
          <ul className="why-list">
            <li>
              ✓ 100% Genuine products from trusted manufacturers and supply
              channels
            </li>
            <li>✓ Comprehensive product range covering all safety needs</li>
            <li>✓ Expert consultation and after-sales support</li>
            <li>✓ Competitive pricing with bulk order discounts</li>
            <li>✓ Pan-India delivery network</li>
            <li>✓ Quality assurance and warranty support</li>
          </ul>
        </div>

        <div className="about-section">
          <h2>Company Registrations</h2>
          <ul className="why-list registration-list">
            <li>
              <strong>GSTIN:</strong> 24MDBPS1939J1Z3
            </li>
            <li>
              <strong>UDYAM Reg No:</strong> UDYAM-GJ-01-0433050
            </li>
          </ul>
        </div>

        <div className="cta-box">
          <h3>Ready to get started?</h3>
          <p>Let us help you create a safer workplace</p>
          <Link to="/contact" className="cta-btn">
            Contact Us Today
          </Link>
        </div>
      </section>
    </div>
  );
};

export default About;
