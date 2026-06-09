import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Login.css';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: ''
  });
  
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isLogin) {
      const result = await login({ email: formData.email, password: formData.password });
      if (result.success) {
        navigate(result.user.role === 'admin' ? '/admin' : '/dashboard');
      }
    } else {
      const result = await register(formData);
      if (result.success) {
        navigate('/dashboard');
      }
    }
  };

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="hexagon"></div>
        <div className="hexagon"></div>
        <div className="hexagon"></div>
      </div>
      
      <div className="login-card">
        <div className="login-header">
          <div className="bee-icon">🐝</div>
          <h1>Smart Beehive</h1>
          <p>Monitor your colonies in real-time</p>
        </div>

        <div className="auth-toggle">
          <button 
            className={isLogin ? 'active' : ''} 
            onClick={() => setIsLogin(true)}
          >
            Login
          </button>
          <button 
            className={!isLogin ? 'active' : ''} 
            onClick={() => setIsLogin(false)}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {!isLogin && (
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="John Doe"
              />
            </div>
          )}

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="you@example.com"
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="••••••••"
              minLength={6}
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label>Phone (optional)</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+91 99999 99999"
              />
            </div>
          )}

          <button type="submit" className="submit-btn">
            {isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {isLogin && (
          <div className="demo-credentials">
            <p><strong>Demo Credentials:</strong></p>
            <p>Admin: admin@beehive.com / admin123</p>
            <p>Farmer: farmer@beehive.com / farmer123</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
