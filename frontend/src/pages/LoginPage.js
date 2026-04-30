// src/pages/LoginPage.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import api from '../services/api';
import toast from 'react-hot-toast';
import './AuthPages.css';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      login(data.user, data.token);
      toast.success(`Welcome back, ${data.user.firstName}!`);
      navigate(data.user.role === 'agent' ? '/agent/dashboard' : '/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-visual">
        <img src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200" alt="Property" />
        <div className="auth-visual-overlay">
          <Link to="/" className="auth-logo">⌂ ESTATE<strong>HUB</strong></Link>
          <blockquote className="auth-quote">
            "The best investment on earth is earth."
            <cite>— Louis Glickman</cite>
          </blockquote>
        </div>
      </div>

      <div className="auth-form-wrap">
        <div className="auth-form-inner">
          <div className="auth-header">
            <h1>Welcome Back</h1>
            <p>Sign in to access your account</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                className="form-input"
                type="email"
                placeholder="your@email.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="password-input">
                <input
                  className="form-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                />
                <button type="button" className="password-toggle" onClick={() => setShowPassword(s => !s)}>
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Demo credentials */}
            <div className="demo-creds">
              <p>Demo credentials:</p>
              <button type="button" className="demo-btn" onClick={() => setForm({ email: 'sarah@estatehub.com', password: 'password123' })}>
                🏠 Agent Account
              </button>
              <button type="button" className="demo-btn" onClick={() => setForm({ email: 'emma@example.com', password: 'password123' })}>
                👤 Buyer Account
              </button>
            </div>

            <button type="submit" className="btn btn-primary btn-lg auth-submit" disabled={loading}>
              {loading ? <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2, borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} /> Signing in…</> : 'Sign In →'}
            </button>
          </form>

          <p className="auth-switch">
            Don't have an account? <Link to="/register">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
