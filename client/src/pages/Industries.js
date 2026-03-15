import React from "react";
import SeoHead from "../components/SeoHead";
import "../styles/Industries.css";

const Industries = () => {
  const industries = [
    {
      name: "Construction & Infrastructure",
      desc: "Complete PPE for construction sites and infrastructure projects",
      icon: "🏗️",
    },
    {
      name: "Manufacturing & Engineering",
      desc: "Safety solutions for manufacturing facilities and workshops",
      icon: "⚙️",
    },
    {
      name: "Oil, Gas & Petrochemical",
      desc: "Specialized equipment for hazardous environments",
      icon: "🛢️",
    },
    {
      name: "Mining & Quarrying",
      desc: "Heavy-duty protection for mining operations",
      icon: "⛏️",
    },
    {
      name: "Healthcare & Pharma",
      desc: "Medical-grade protective equipment",
      icon: "⚕️",
    },
    {
      name: "Chemical & Laboratories",
      desc: "Chemical-resistant safety gear",
      icon: "🧪",
    },
    {
      name: "Warehousing & Logistics",
      desc: "Safety equipment for storage and transport",
      icon: "📦",
    },
    {
      name: "Automotive & Metal",
      desc: "Welding and metal work protection",
      icon: "🔧",
    },
  ];

  return (
    <div className="industries-page">
      <SeoHead
        title="Industries We Serve | PPE Solutions for Construction, Manufacturing and More"
        description="ARIHAAN ENTERPRISES supplies industry-specific PPE and safety solutions for construction, manufacturing, oil and gas, mining, logistics, healthcare, and chemical operations."
        canonicalPath="/industries"
      />

      <section className="page-header">
        <h1>Industries We Serve</h1>
        <p>
          Specialized PPE solutions for diverse industry requirements across
          India
        </p>
      </section>

      <section className="industries-section">
        <div className="industries-grid">
          {industries.map((industry, idx) => (
            <div key={idx} className="industry-card">
              <div className="industry-icon-wrapper">
                <span className="industry-icon">{industry.icon}</span>
              </div>
              <h3>{industry.name}</h3>
              <p>{industry.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Industries;
