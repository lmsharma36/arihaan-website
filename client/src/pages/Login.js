import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { auth } from "../services/api";
import SeoHead from "../components/SeoHead";
import "../styles/Login.css";

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === "Escape") {
        navigate("/");
      }
    };

    document.addEventListener("keydown", handleEscKey);
    return () => document.removeEventListener("keydown", handleEscKey);
  }, [navigate]);

  const handleOutsideClick = (e) => {
    if (e.target === e.currentTarget) {
      navigate("/");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError("");
  };

  const handlePasswordFieldChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({
      ...prev,
      [name]: value,
    }));
    setPasswordError("");
  };

  const toggleChangePassword = () => {
    setShowChangePassword((prev) => !prev);
    setPasswordError("");
    setPasswordSuccess("");

    setPasswordForm((prev) => ({
      ...prev,
      email: prev.email || formData.email || "",
    }));
  };

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    const email = String(passwordForm.email || "")
      .trim()
      .toLowerCase();
    const currentPassword = String(passwordForm.currentPassword || "");
    const newPassword = String(passwordForm.newPassword || "");
    const confirmPassword = String(passwordForm.confirmPassword || "");

    if (!email || !currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Please fill all password change fields.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirm password do not match.");
      return;
    }

    if (newPassword === currentPassword) {
      setPasswordError("New password must be different from current password.");
      return;
    }

    setPasswordLoading(true);

    try {
      const response = await auth.changePassword(
        email,
        currentPassword,
        newPassword,
      );

      if (response.success) {
        setPasswordSuccess("Password changed successfully. You can login now.");
        setPasswordForm({
          email,
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        setFormData((prev) => ({ ...prev, email }));
      } else {
        setPasswordError(response.message || "Unable to change password.");
      }
    } catch (err) {
      setPasswordError(err.message || "Unable to change password.");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await auth.login(formData.email, formData.password);

      if (response.success) {
        // Store user and token in localStorage
        localStorage.setItem("user", JSON.stringify(response.user));
        localStorage.setItem("token", response.token);

        setSuccess("✅ Login successful! Redirecting...");

        // Redirect to home or products after 1 second
        setTimeout(() => {
          navigate("/");
        }, 1000);
      } else {
        setError(response.message || "Login failed. Please try again.");
      }
    } catch (err) {
      setError(err.message || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page" onClick={handleOutsideClick}>
      <SeoHead
        title="Admin Login | ARIHAAN ENTERPRISES"
        description="Admin-only login page."
        canonicalPath="/login"
        noIndex
      />
      <div className="login-container">
        <div className="login-card">
          <h1>ARIHAAN</h1>
          <h2>Admin Login</h2>
          <p className="login-subtitle">
            Enter your credentials to access the admin panel
          </p>

          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="Enter admin email"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            <button type="submit" className="btn-login" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          <div className="password-tools">
            <button
              type="button"
              className="btn-password-toggle"
              onClick={toggleChangePassword}
              disabled={passwordLoading}
            >
              {showChangePassword ? "Hide Password Change" : "Change Password"}
            </button>

            {showChangePassword && (
              <div className="change-password-panel">
                <h4>Update Admin Password</h4>

                {passwordError && (
                  <div className="alert alert-error">{passwordError}</div>
                )}
                {passwordSuccess && (
                  <div className="alert alert-success">{passwordSuccess}</div>
                )}

                <form
                  onSubmit={handleChangePasswordSubmit}
                  className="change-password-form"
                >
                  <div className="form-group">
                    <label htmlFor="change-email">Email Address</label>
                    <input
                      type="email"
                      id="change-email"
                      name="email"
                      placeholder="Enter admin email"
                      value={passwordForm.email}
                      onChange={handlePasswordFieldChange}
                      required
                      disabled={passwordLoading}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="current-password">Current Password</label>
                    <input
                      type="password"
                      id="current-password"
                      name="currentPassword"
                      placeholder="Enter current password"
                      value={passwordForm.currentPassword}
                      onChange={handlePasswordFieldChange}
                      required
                      disabled={passwordLoading}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="new-password">New Password</label>
                    <input
                      type="password"
                      id="new-password"
                      name="newPassword"
                      placeholder="Enter new password"
                      value={passwordForm.newPassword}
                      onChange={handlePasswordFieldChange}
                      required
                      minLength={6}
                      disabled={passwordLoading}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="confirm-password">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      id="confirm-password"
                      name="confirmPassword"
                      placeholder="Confirm new password"
                      value={passwordForm.confirmPassword}
                      onChange={handlePasswordFieldChange}
                      required
                      minLength={6}
                      disabled={passwordLoading}
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn-change-password"
                    disabled={passwordLoading}
                  >
                    {passwordLoading ? "Updating..." : "Update Password"}
                  </button>
                </form>
              </div>
            )}
          </div>

          <div className="login-footer">
            <Link to="/" className="btn-back">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
