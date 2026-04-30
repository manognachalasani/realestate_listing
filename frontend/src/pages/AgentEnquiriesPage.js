import React, { useState, useEffect } from 'react';
import { enquiryAPI } from '../services/api';
import toast from 'react-hot-toast';
import './AgentEnquiriesPage.css';

const STATUS_COLORS = { new: '#e07b50', read: '#6b7fd7', replied: '#4a7c59', closed: '#999' };
const STATUS_LABELS = { new: '🔴 New', read: '🔵 Read', replied: '✅ Replied', closed: '⚫ Closed' };

export default function AgentEnquiriesPage() {
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchEnquiries();
  }, [statusFilter]);

  const fetchEnquiries = async () => {
    setLoading(true);
    try {
      const params = { limit: 50 };
      if (statusFilter) params.status = statusFilter;
      const { data } = await enquiryAPI.getAgentEnquiries(params);
      setEnquiries(data.enquiries);
    } catch {
      toast.error('Failed to load enquiries');
    } finally {
      setLoading(false);
    }
  };

  const openEnquiry = async (enquiry) => {
    setSelected(enquiry);
    setNote(enquiry.agentNotes || '');
    // Mark as read if new
    if (enquiry.status === 'new') {
      await updateStatus(enquiry._id, 'read');
    }
  };

  const updateStatus = async (id, status, agentNotes) => {
    setSaving(true);
    try {
      const payload = { status };
      if (agentNotes !== undefined) payload.agentNotes = agentNotes;
      const { data } = await enquiryAPI.updateStatus(id, payload);
      setEnquiries(prev => prev.map(e => e._id === id ? { ...e, ...data } : e));
      if (selected?._id === id) setSelected(prev => ({ ...prev, ...data }));
    } catch {
      toast.error('Could not update enquiry');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNote = async () => {
    if (!selected) return;
    await updateStatus(selected._id, selected.status, note);
    toast.success('Notes saved');
  };

  const counts = enquiries.reduce((acc, e) => {
    acc[e.status] = (acc[e.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="enquiries-page">
      <div className="container">
        <div className="enq-header">
          <h1>Enquiries</h1>
          <p>Manage leads from potential buyers</p>
        </div>

        {/* Status summary */}
        <div className="enq-summary">
          {Object.entries(STATUS_LABELS).map(([status, label]) => (
            <button
              key={status}
              className={`enq-tab ${statusFilter === status ? 'active' : ''}`}
              onClick={() => setStatusFilter(prev => prev === status ? '' : status)}
              style={{ '--color': STATUS_COLORS[status] }}
            >
              <span className="enq-tab-count">{counts[status] || 0}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>

        <div className="enq-layout">
          {/* Enquiry list */}
          <div className="enq-list">
            {loading ? (
              <div className="loading-screen"><div className="spinner" /></div>
            ) : enquiries.length === 0 ? (
              <div className="enq-empty">
                <div style={{ fontSize: 48 }}>📬</div>
                <h3>No enquiries yet</h3>
                <p>When buyers contact you, their messages will appear here.</p>
              </div>
            ) : (
              enquiries.map(enq => (
                <div
                  key={enq._id}
                  className={`enq-card ${selected?._id === enq._id ? 'selected' : ''} ${enq.status === 'new' ? 'unread' : ''}`}
                  onClick={() => openEnquiry(enq)}
                >
                  <div className="enq-card-top">
                    <div className="enq-sender">
                      <div className="enq-avatar">
                        {enq.buyer?.avatar
                          ? <img src={enq.buyer.avatar} alt="" />
                          : <span>{enq.senderName?.[0] || '?'}</span>
                        }
                      </div>
                      <div>
                        <div className="enq-sender-name">{enq.senderName || 'Unknown'}</div>
                        <div className="enq-sender-email">{enq.senderEmail}</div>
                      </div>
                    </div>
                    <div className="enq-meta">
                      <span className="enq-status-dot" style={{ background: STATUS_COLORS[enq.status] }} />
                      <span className="enq-date">{new Date(enq.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {enq.property && (
                    <div className="enq-property-mini">
                      🏠 {enq.property.title}
                    </div>
                  )}

                  <p className="enq-preview">{enq.message}</p>

                  <div className="enq-type-badge">
                    <span className="badge badge-gold" style={{ fontSize: 11 }}>{enq.enquiryType}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Detail panel */}
          <div className="enq-detail">
            {selected ? (
              <>
                <div className="enq-detail-header">
                  <div>
                    <h3>{selected.senderName}</h3>
                    <div className="enq-detail-sub">
                      <a href={`mailto:${selected.senderEmail}`}>📧 {selected.senderEmail}</a>
                      {selected.senderPhone && <a href={`tel:${selected.senderPhone}`}>📞 {selected.senderPhone}</a>}
                    </div>
                  </div>
                  <div className="enq-detail-actions">
                    <select
                      className="form-select"
                      value={selected.status}
                      onChange={e => updateStatus(selected._id, e.target.value)}
                      disabled={saving}
                    >
                      <option value="new">New</option>
                      <option value="read">Read</option>
                      <option value="replied">Replied</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>

                {selected.property && (
                  <div className="enq-linked-property">
                    <div className="linked-prop-img">
                      {selected.property.photos?.[0]?.url
                        ? <img src={selected.property.photos[0].url} alt="" />
                        : <span>⌂</span>
                      }
                    </div>
                    <div>
                      <div className="linked-prop-title">{selected.property.title}</div>
                      <div className="linked-prop-price">${selected.property.price?.toLocaleString()}</div>
                    </div>
                  </div>
                )}

                <div className="enq-message-box">
                  <div className="enq-message-meta">
                    <span className="badge badge-gold">{selected.enquiryType}</span>
                    <span>{new Date(selected.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="enq-full-message">{selected.message}</p>

                  {selected.preferredViewingDate && (
                    <div className="viewing-info">
                      📅 Preferred Viewing: {new Date(selected.preferredViewingDate).toDateString()} {selected.preferredViewingTime && `· ${selected.preferredViewingTime}`}
                    </div>
                  )}
                </div>

                <div className="enq-notes">
                  <label className="form-label">Agent Notes (private)</label>
                  <textarea
                    className="form-textarea"
                    rows={4}
                    placeholder="Add your notes about this lead..."
                    value={note}
                    onChange={e => setNote(e.target.value)}
                  />
                  <div className="enq-note-actions">
                    <a href={`mailto:${selected.senderEmail}?subject=Re: ${selected.property?.title || 'Your enquiry'}`} className="btn btn-dark btn-sm">
                      ✉️ Reply by Email
                    </a>
                    <button className="btn btn-outline btn-sm" onClick={handleSaveNote} disabled={saving}>
                      {saving ? '…' : '💾 Save Notes'}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="enq-empty-detail">
                <div style={{ fontSize: 48 }}>👈</div>
                <p>Select an enquiry to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
