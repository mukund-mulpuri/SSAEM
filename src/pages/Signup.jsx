// src/pages/Signup.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./Signup.css";
import { registerApi } from "../api/auth";
import { FiEye, FiEyeOff } from "react-icons/fi";

const SignupPage = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [adminKey, setAdminKey] = useState("");   // ✅ new field
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // this page is only for Admin creation
  const role = "admin";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!adminKey.trim()) {
      setError("Admin Keyword is required.");
      return;
    }

    setLoading(true);
    try {
      await registerApi({ name, email, password, role, adminKey });
      navigate("/login");
    } catch (err) {
      setError(
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Registration failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-box">
        <h2>Create Admin Account</h2>
        <p className="note">Registration is restricted to Admins. Enter the Admin Keyword to proceed.</p>

        {error && <div className="error">{error}</div>}

        <form onSubmit={handleSubmit} className="signup-form">
          <div>
            <label>Name</label>
            <input
              type="text"
              placeholder="Enter full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label>Email</label>
            <input
              type="email"
              placeholder="Enter admin email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* 🔐 Admin Keyword */}
          <div>
            <label>Admin Keyword</label>
            <input
              type="text"
              placeholder="Enter Admin Keyword"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              required
            />
            <small className="muted">This must match the secret configured by your backend.</small>
          </div>

          {/* 👁️ Password with show/hide toggle */}
          <div className="password-wrapper">
            <label>Password</label>
            <div className="password-field">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <span
                className="toggle-icon"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setShowPassword(!showPassword)}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </span>
            </div>
          </div>

          {/* Role is fixed to admin */}
          <div>
            <label>Role</label>
            <input value="Admin" readOnly className="role-readonly" />
          </div>

          <button type="submit" disabled={loading} className="signup-button">
            {loading ? "Creating admin..." : "Sign Up as Admin"}
          </button>
        </form>

        <p className="login-text">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
};

export default SignupPage;
