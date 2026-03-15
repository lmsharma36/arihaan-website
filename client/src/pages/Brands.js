import React from "react";
import SeoHead from "../components/SeoHead";
import "../styles/Brands.css";

const Brands = () => {
  const brands = [
    {
      name: "3M",
      description: "Global leader in safety and industrial products",
    },
    {
      name: "Honeywell",
      description: "Trusted name in personal protective equipment",
    },
    { name: "Ansell", description: "Specialist in hand and body protection" },
    {
      name: "Karam",
      description: "Leading Indian safety equipment manufacturer",
    },
    {
      name: "Dräger",
      description: "German excellence in respiratory protection",
    },
    { name: "Udyogi", description: "Quality safety products made in India" },
  ];

  return (
    <div className="brands-page">
      <SeoHead
        title="Safety Brands We Supply | 3M, Honeywell, Ansell, Karam, Dräger, Udyogi"
        description="Explore global and Indian safety brands supplied by ARIHAAN ENTERPRISES, including 3M, Honeywell, Ansell, Karam, Dräger, and Udyogi."
        canonicalPath="/brands"
      />

      <section className="page-header dark">
        <h1>Our Trusted Brands</h1>
        <p>
          Trusted supplier of world's most reputed safety equipment
          manufacturers
        </p>
      </section>

      <section className="brands-section">
        <div className="section-label">Premium Quality Brands</div>
        <div className="brands-grid">
          {brands.map((brand, idx) => (
            <div key={idx} className="brand-card">
              <h2>{brand.name}</h2>
              <p>{brand.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="why-authorized">
        <h2>Why buy from us?</h2>
        <div className="benefits-grid">
          <div className="benefit-card">
            <h3>✓ 100% Genuine Products</h3>
            <p>Direct sourcing ensures authenticity</p>
          </div>
          <div className="benefit-card">
            <h3>✓ Warranty Support</h3>
            <p>Full manufacturer warranty coverage</p>
          </div>
          <div className="benefit-card">
            <h3>✓ Best Prices</h3>
            <p>Competitive rates without compromise</p>
          </div>
          <div className="benefit-card">
            <h3>✓ Expert Guidance</h3>
            <p>Technical support from certified professionals</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Brands;
