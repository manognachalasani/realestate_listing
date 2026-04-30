import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import api from '../services/api';
import toast from 'react-hot-toast';
import './AuthPages.css';

export default function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '',
    password: '', confirmPassword: '', role: 'buyer', phone: '',
  });
  const [loading, setLoading] = useState(false);

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match'); return;
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters'); return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', form);
      login(data.user, data.token);
      toast.success(`Welcome to EstateHub, ${data.user.firstName}!`);
      navigate(data.user.role === 'agent' ? '/agent/dashboard' : '/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-visual">
        <img src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200" alt="Luxury home" />
        <div className="auth-visual-overlay">
          <Link to="/" className="auth-logo">⌂ ESTATE<strong>HUB</strong></Link>
          <div className="auth-features">
            <div className="auth-feature"><span>✓</span> Access thousands of listings</div>
            <div className="auth-feature"><span>✓</span> Save your favourite properties</div>
            <div className="auth-feature"><span>✓</span> Connect directly with agents</div>
            <div className="auth-feature"><span>✓</span> Get personalised recommendations</div>
          </div>
        </div>
      </div>

      <div className="auth-form-wrap">
        <div className="auth-form-inner">
          <div className="auth-header">
            <h1>Create Account</h1>
            <p>Join thousands of happy home-finders</p>
          </div>

          {/* Role selector */}
          <div className="role-selector">
            <button
              type="button"
              className={`role-btn ${form.role === 'buyer' ? 'active' : ''}`}
              onClick={() => set('role', 'buyer')}
            >
              <span className="role-icon">👤</span>
              <strong>I'm a Buyer</strong>
              <small>Search & save properties</small>
            </button>
            <button
              type="button"
              className={`role-btn ${form.role === 'agent' ? 'active' : ''}`}
              onClick={() => set('role', 'agent')}
            >
              <span className="role-icon">🏠</span>
              <strong>I'm an Agent</strong>
              <small>List & manage properties</small>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label">First Name</label>
                <input className="form-input" placeholder="John" value={form.firstName} onChange={e => set('firstName', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name</label>
                <input className="form-input" placeholder="Doe" value={form.lastName} onChange={e => set('lastName', e.target.value)} required />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input className="form-input" type="email" placeholder="your@email.com" value={form.email} onChange={e => set('email', e.target.value)} required />
            </div>

            <div className="form-group">
              <label className="form-label">Phone (optional)</label>
              <input className="form-input" type="tel" placeholder="+1 (555) 000-0000" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className="form-input" type="password" placeholder="Min 6 characters" value={form.password} onChange={e => set('password', e.target.value)} required minLength={6} />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input className="form-input" type="password" placeholder="Repeat password" value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} required />
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-lg auth-submit" disabled={loading}>
              {loading
                ? <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2, borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} /> Creating account…</>
                : `Create ${form.role === 'agent' ? 'Agent' : 'Buyer'} Account →`}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
