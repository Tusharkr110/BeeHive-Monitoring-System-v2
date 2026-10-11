import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/Login.css";
import ThemeToggle from "./ThemeToggle";
import LoginHexWall from "./LoginHexWall";

const FEATURES = [
  {
    icon: "⚡",
    bg: "rgba(34,211,238,0.1)",
    title: "Real-time Monitoring",
    desc: "Live sensor data every 30 seconds",
  },
  {
    icon: "🤖",
    bg: "rgba(167,139,250,0.1)",
    title: "AI Health Diagnosis",
    desc: "Random Forest colony analysis",
  },
  {
    icon: "📲",
    bg: "rgba(34,197,94,0.1)",
    title: "SMS Alerts",
    desc: "Instant critical notifications",
  },
  {
    icon: "📊",
    bg: "rgba(234,179,8,0.1)",
    title: "Trend History",
    desc: "Temperature & health charts",
  },
];

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    phone: "",
  });
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    if (isLogin) {
      const result = await login({
        email: formData.email,
        password: formData.password,
      });
      if (result.success)
        navigate(result.user.role === "admin" ? "/admin" : "/dashboard");
    } else {
      const result = await register(formData);
      if (result.success) navigate("/dashboard");
    }
    setLoading(false);
  };

  return (
    <div className="login-page">
      <LoginHexWall />
      {/* ── Left Branding Panel ── */}
      <div className="login-left">
        <div className="login-left-brand">
          <div className="login-left-logo">
            <div className="login-left-logo-icon">🐝</div>
            <span className="login-left-logo-text">
              Bharat<span>Bee</span>{" "}
            </span>
          </div>

          <h1 className="login-hero-title">
            Colony intelligence
            <br />
            <span className="grad-text">at your fingertips.</span>
          </h1>
          <p className="login-hero-sub">
            Monitor temperature, humidity, sound and AI-powered health
            diagnostics across all your beehives — in real time.
          </p>

          <div className="login-features">
            {FEATURES.map((f) => (
              <div className="login-feature-item" key={f.title}>
                <div
                  className="login-feature-icon"
                  style={{ background: f.bg }}
                >
                  {f.icon}
                </div>
                <div className="login-feature-text">
                  <h4>{f.title}</h4>
                  <p>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* <div className="login-footer" style={{ color: '#2d3344', fontSize: 12 }}>
          © 2026 BeeHive Monitor · IoT + ML Apiary System
        </div> */}
      </div>

      {/* ── Right Form Panel ── */}
      <div className="login-right">
        <div className="login-form-box">
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: "16px",
            }}
          >
            <ThemeToggle compact={true} />
          </div>
          <h2 className="login-form-title">
            {isLogin ? "Welcome back" : "Create account"}
          </h2>
          <p className="login-form-sub">
            {isLogin
              ? "Sign in to your monitoring dashboard"
              : "Join as a beekeeper to start monitoring"}
          </p>

          <div className="login-tab-toggle">
            <button
              className={`login-tab-btn ${isLogin ? "active" : ""}`}
              onClick={() => setIsLogin(true)}
            >
              Sign In
            </button>
            <button
              className={`login-tab-btn ${!isLogin ? "active" : ""}`}
              onClick={() => setIsLogin(false)}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <div className="login-field">
                <label>Full Name</label>
                <input
                  name="name"
                  type="text"
                  placeholder="John Apiarist"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
            )}
            <div className="login-field">
              <label>Email Address</label>
              <input
                name="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="login-field">
              <label>Password</label>
              <input
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
              />
            </div>
            {!isLogin && (
              <div className="login-field">
                <label>Phone (optional)</label>
                <input
                  name="phone"
                  type="tel"
                  placeholder="+91 99999 99999"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
            )}
            <button
              type="submit"
              className="login-submit-btn"
              disabled={loading}
            >
              {loading
                ? "Please wait…"
                : isLogin
                  ? "Sign In →"
                  : "Create Account →"}
            </button>
          </form>

          {isLogin && (
            <div className="login-demo-box">
              <div className="login-demo-box-title">🔑 Demo Credentials</div>
              <div className="login-demo-row">
                <span className="login-demo-label">Admin</span>
                <span className="login-demo-creds">
                  admin@beehive.com · admin123
                </span>
              </div>
              <div className="login-demo-row">
                <span className="login-demo-label">Farmer</span>
                <span className="login-demo-creds">
                  farmer@beehive.com · farmer123
                </span>
              </div>
            </div>
          )}

          <div className="login-footer">
            Secure login · JWT Authentication · Data encrypted
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
