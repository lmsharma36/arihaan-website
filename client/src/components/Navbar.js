import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../styles/Navbar.css";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const navLinksRef = useRef(null);
  const menuToggleRef = useRef(null);

  useEffect(() => {
    // Check if user is logged in
    const user = localStorage.getItem("user");
    setIsLoggedIn(!!user);
  }, [location]);

  useEffect(() => {
    // Always reveal navbar and close mobile menu on route change.
    setIsHidden(false);
    setIsOpen(false);
  }, [location.pathname, location.search]);

  // ✅ CLICK OUTSIDE HANDLER FOR MOBILE MENU
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!navLinksRef.current || !menuToggleRef.current) return;

      // Check if click is outside menu and not on the toggle button
      if (
        !navLinksRef.current.contains(event.target) &&
        !menuToggleRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("click", handleClickOutside);
    }

    return () => document.removeEventListener("click", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    const lastScrollY = { current: window.scrollY };

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (isOpen) {
        setIsHidden(false);
        lastScrollY.current = currentScrollY;
        return;
      }

      setIsScrolled(currentScrollY > 10);

      if (currentScrollY <= 10) {
        setIsHidden(false);
      } else if (
        currentScrollY > lastScrollY.current + 2 &&
        currentScrollY > 120
      ) {
        setIsHidden(true);
      } else if (currentScrollY < lastScrollY.current - 2) {
        setIsHidden(false);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isOpen]);

  const isActive = (path) => {
    return location.pathname === path ? "active" : "";
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    setIsOpen(false);
    navigate("/");
  };

  return (
    <nav
      className={`navbar ${isHidden ? "hidden" : ""} ${isScrolled ? "scrolled" : ""}`}
    >
      <div className="nav-container">
        <Link to="/" className="logo">
          ARIHAAN <span>ENTERPRISES</span>
        </Link>

        <button
          ref={menuToggleRef}
          className={`mobile-menu-toggle ${isOpen ? "open" : ""}`}
          onClick={() => setIsOpen(!isOpen)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        {/* Mobile menu backdrop overlay */}
        {isOpen && (
          <div
            className="navbar-backdrop"
            onClick={() => setIsOpen(false)}
          ></div>
        )}

        <ul ref={navLinksRef} className={`nav-links ${isOpen ? "active" : ""}`}>
          <li>
            <Link
              to="/"
              className={isActive("/")}
              onClick={() => setIsOpen(false)}
            >
              Home
            </Link>
          </li>
          <li>
            <Link
              to="/products"
              className={isActive("/products")}
              onClick={() => setIsOpen(false)}
            >
              Products
            </Link>
          </li>
          <li>
            <Link
              to="/brands"
              className={isActive("/brands")}
              onClick={() => setIsOpen(false)}
            >
              Brands
            </Link>
          </li>
          <li>
            <Link
              to="/industries"
              className={isActive("/industries")}
              onClick={() => setIsOpen(false)}
            >
              Industries
            </Link>
          </li>
          <li>
            <Link
              to="/about"
              className={isActive("/about")}
              onClick={() => setIsOpen(false)}
            >
              About
            </Link>
          </li>
          <li>
            <Link
              to="/contact"
              className={isActive("/contact")}
              onClick={() => setIsOpen(false)}
            >
              Contact
            </Link>
          </li>
          {!isLoggedIn && (
            <li className="mobile-auth-item">
              <Link
                to="/login"
                className={isActive("/login")}
                onClick={() => setIsOpen(false)}
              >
                Admin Login
              </Link>
            </li>
          )}
          {isLoggedIn && (
            <li className="mobile-auth-item">
              <button
                type="button"
                className="mobile-auth-button"
                onClick={handleLogout}
              >
                Logout
              </button>
            </li>
          )}
        </ul>

        {!isLoggedIn && (
          <Link
            to="/login"
            className="cta-button desktop-auth-cta"
            onClick={() => setIsOpen(false)}
          >
            Admin Login
          </Link>
        )}
        {isLoggedIn && (
          <button
            onClick={handleLogout}
            className="cta-button logout-cta desktop-auth-cta"
          >
            Logout
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
