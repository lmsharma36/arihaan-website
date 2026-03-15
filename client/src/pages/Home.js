import React from "react";
import { Link } from "react-router-dom";
import SeoHead from "../components/SeoHead";
import "../styles/Home.css";
import { buildAbsoluteUrl } from "../utils/seo";

const faqItems = [
  {
    question: "Do you supply PPE in bulk across India?",
    answer:
      "Yes. ARIHAAN ENTERPRISES supplies industrial PPE and safety equipment in bulk for projects, factories, warehouses, and contractors across India.",
  },
  {
    question: "Which safety product categories are available?",
    answer:
      "We supply safety helmets, respirators, safety shoes, gloves, eye and face protection, fall protection equipment, and other workplace safety products.",
  },
  {
    question: "Do you provide branded and certified products?",
    answer:
      "Yes. We supply certified products from trusted brands such as 3M, Honeywell, Ansell, Karam, Udyogi, and Drager, based on category and availability.",
  },
  {
    question: "Can you help us choose the right PPE for our industry?",
    answer:
      "Yes. We provide expert guidance to help businesses select PPE based on hazards, compliance requirements, and operating conditions.",
  },
];

const homeStructuredData = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "ARIHAAN ENTERPRISES",
    url: buildAbsoluteUrl("/"),
    logo: buildAbsoluteUrl("/safetyImage.jpg"),
    email: "sales@arihaanenterprises.com",
    telephone: "+91 92270 53200",
    address: {
      "@type": "PostalAddress",
      streetAddress:
        "14TH FLOOR, B-1 1403, SANGATH PURE, NEAR ZUNDAL CIRCLE, CHANDKHEDA",
      addressLocality: "Ahmedabad",
      addressRegion: "Gujarat",
      postalCode: "382424",
      addressCountry: "IN",
    },
    areaServed: "IN",
    description:
      "Trusted PPE and industrial safety equipment supplier in India for helmets, gloves, respirators, footwear, fall protection, and workplace safety gear.",
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "ARIHAAN ENTERPRISES",
    url: buildAbsoluteUrl("/"),
    potentialAction: {
      "@type": "SearchAction",
      target: `${buildAbsoluteUrl("/products")}?search={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  },
];

const Home = () => {
  const stats = [
    { number: "500+", label: "Products" },
    { number: "100%", label: "Certified" },
    { number: "24/7", label: "Support" },
  ];

  const brands = ["3M", "Honeywell", "Ansell", "Udyogi", "Karam", "Dräger"];

  const features = [
    {
      icon: "✓",
      title: "100% Genuine Products",
      description:
        "All products sourced through trusted supply channels with proper certifications.",
    },
    {
      icon: "🚚",
      title: "Pan-India Delivery",
      description:
        "Fast and reliable delivery network across India ensures timely delivery.",
    },
    {
      icon: "💰",
      title: "Competitive Pricing",
      description:
        "Best wholesale rates with special discounts on bulk orders.",
    },
    {
      icon: "🎯",
      title: "Expert Consultation",
      description:
        "Our safety experts help you choose the right PPE for your requirements.",
    },
    {
      icon: "🔧",
      title: "Custom Solutions",
      description:
        "Tailored safety packages designed for your workplace hazards.",
    },
    {
      icon: "🛡️",
      title: "Quality Assurance",
      description:
        "Rigorous quality checks with replacement warranty on defects.",
    },
  ];

  return (
    <div className="home-page">
      <SeoHead
        title="PPE Supplier in India | Safety Equipment and Industrial PPE | ARIHAAN ENTERPRISES"
        description="Buy genuine PPE, safety shoes, helmets, gloves, respirators, and industrial safety equipment from ARIHAAN ENTERPRISES with pan-India supply and expert support."
        canonicalPath="/"
        structuredData={homeStructuredData}
      />

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-text">
            <div className="company-tagline">ARIHAAN ENTERPRISES</div>
            <h1>
              YOUR TRUSTED
              <span className="highlight">SAFETY PARTNER</span>
            </h1>
            <p>
              Complete range of Personal Protective Equipment and Safety
              Solutions. Trusted supplier of world's leading brands - 3M,
              Honeywell, Ansell, Udyogi, Karam, Dräger and more.
            </p>
            <div className="hero-buttons">
              <Link to="/products" className="primary">
                Explore Products
              </Link>
              <Link to="/contact" className="secondary">
                Contact Us
              </Link>
            </div>
            <div className="trusted-brands">
              <p>Trusted Supplier of Premium Brands</p>
              <div className="brand-logos">
                {brands.map((brand, index) => (
                  <span key={index} className="brand-logo">
                    {brand}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="hero-stats">
            {stats.map((stat, index) => (
              <div key={index} className="stat-item">
                <span className="stat-number">{stat.number}</span>
                <span className="stat-label">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="section-header">
          <div className="section-label">Why Choose ARIHAAN</div>
          <h2 className="section-title">Your Safety is Our Priority</h2>
          <p className="section-description">
            We don't just sell safety equipment, we ensure your complete
            workplace safety with quality products and expert guidance.
          </p>
        </div>
        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-item">
              <div className="feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="home-faq-section">
        <div className="section-header">
          <div className="section-label">PPE Supplier FAQs</div>
          <h2 className="section-title">
            Common Questions About Industrial Safety Equipment
          </h2>
          <p className="section-description">
            Quick answers for companies searching for reliable PPE suppliers,
            bulk safety products, and compliant workplace safety gear in India.
          </p>
        </div>

        <div className="home-faq-grid">
          {faqItems.map((item, index) => (
            <article key={index} className="home-faq-item">
              <h3>{item.question}</h3>
              <p>{item.answer}</p>
            </article>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2>Ready to Protect Your Team?</h2>
          <p>
            Get in touch with us for quotes, bulk orders, or safety
            consultation.
          </p>
          <div className="cta-buttons">
            <Link to="/products" className="cta-btn primary">
              View Products
            </Link>
            <Link to="/contact" className="cta-btn secondary">
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
