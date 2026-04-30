import React, { useState } from 'react';
import { useAuth } from '../../App';
import { enquiryAPI } from '../../services/api';
import toast from 'react-hot-toast';
import './EnquiryForm.css';

const ENQUIRY_TYPES = [
  { value: 'general', label: '💬 General Enquiry' },
  { value: 'viewing', label: '🏠 Schedule Viewing' },
  { value: 'offer', label: '💰 Make an Offer' },
  { value: 'information', label: '📋 Request Info' },
];

export default function EnquiryForm({ property, agent }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    enquiryType: 'general',
    message: '',
    preferredViewingDate: '',
    preferredViewingTime: '',
    guestName: '',
    guestEmail: '',
    guestPhone: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.message.trim()) { toast.error('Please enter a message'); return; }
    if (!user && (!form.guestName || !form.guestEmail)) {
      toast.error('Name and email are required'); return;
    }

    setSubmitting(true);
    try {
      await enquiryAPI.create({ propertyId: property._id, ...form });
      setSubmitted(true);
      toast.success('Enquiry sent! The agent will be in touch soon.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send enquiry');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="enquiry-success">
        <div className="success-icon">✅</div>
        <h3>Enquiry Sent!</h3>
        <p>Your message has been forwarded to <strong>{agent?.firstName} {agent?.lastName}</strong>. Expect a response within 24 hours.</p>
        <button className="btn btn-outline btn-sm" onClick={() => setSubmitted(false)}>Send Another</button>
      </div>
    );
  }

  return (
    <div className="enquiry-form">
      <div className="enquiry-header">
        <div className="agent-card-mini">
          <div className="agent-avatar-lg">
            {agent?.avatar
              ? <img src={agent.avatar} alt={agent.firstName} />
              : <span>{agent?.firstName?.[0]}{agent?.lastName?.[0]}</span>
            }
          </div>
          <div>
            <div className="agent-name-lg">{agent?.firstName} {agent?.lastName}</div>
            <div className="agent-agency">{agent?.agentProfile?.agency || 'EstateHub Realty'}</div>
            {agent?.phone && <a href={`tel:${agent.phone}`} className="agent-phone">📞 {agent.phone}</a>}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="enquiry-body">
        <h4>Send Enquiry</h4>

        {/* Enquiry type */}
        <div className="form-group">
          <label className="form-label">I'm interested in</label>
          <div className="enquiry-types">
            {ENQUIRY_TYPES.map(type => (
              <button
                key={type.value}
                type="button"
                className={`type-btn ${form.enquiryType === type.value ? 'active' : ''}`}
                onClick={() => handleChange('enquiryType', type.value)}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Guest fields */}
        {!user && (
          <div className="guest-fields">
            <div className="form-group">
              <label className="form-label">Your Name *</label>
              <input className="form-input" placeholder="Full name" value={form.guestName} onChange={e => handleChange('guestName', e.target.value)} required />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input className="form-input" type="email" placeholder="your@email.com" value={form.guestEmail} onChange={e => handleChange('guestEmail', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" type="tel" placeholder="(555) 000-0000" value={form.guestPhone} onChange={e => handleChange('guestPhone', e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* Viewing date for viewing enquiries */}
        {form.enquiryType === 'viewing' && (
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Preferred Date</label>
              <input
                className="form-input"
                type="date"
                value={form.preferredViewingDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => handleChange('preferredViewingDate', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Preferred Time</label>
              <select className="form-select" value={form.preferredViewingTime} onChange={e => handleChange('preferredViewingTime', e.target.value)}>
                <option value="">Any time</option>
                <option value="morning">Morning (9am–12pm)</option>
                <option value="afternoon">Afternoon (12pm–5pm)</option>
                <option value="evening">Evening (5pm–8pm)</option>
              </select>
            </div>
          </div>
        )}

        {/* Message */}
        <div className="form-group">
          <label className="form-label">Message *</label>
          <textarea
            className="form-textarea"
            rows={5}
            placeholder={`Hello, I'm interested in "${property?.title}". Could you please provide more information?`}
            value={form.message}
            onChange={e => handleChange('message', e.target.value)}
            required
          />
        </div>

        {user && (
          <div className="logged-in-note">
            Sending as <strong>{user.firstName} {user.lastName}</strong> ({user.email})
          </div>
        )}

        <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={submitting}>
          {submitting ? (
            <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Sending…</>
          ) : (
            '📨 Send Enquiry'
          )}
        </button>

        <p className="enquiry-disclaimer">
          By sending an enquiry, you agree to our <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
        </p>
      </form>
    </div>
  );
}
