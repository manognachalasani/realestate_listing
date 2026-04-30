// src/pages/AgentProfilePage.js
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { agentAPI } from '../services/api';
import PropertyCard from '../components/listings/PropertyCard';
import './AgentProfilePage.css';

export default function AgentProfilePage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    agentAPI.getOne(id)
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading-screen" style={{ minHeight: '80vh' }}><div className="spinner" /></div>;
  if (!data) return <div className="container" style={{ paddingTop: 120 }}><h2>Agent not found</h2></div>;

  const { agent, listings } = data;
  const ap = agent.agentProfile || {};

  return (
    <div className="agent-profile-page">
      <div className="agent-hero">
        <div className="container">
          <div className="agent-hero-content">
            <div className="agent-hero-avatar">
              {agent.avatar
                ? <img src={agent.avatar} alt={agent.firstName} />
                : <span>{agent.firstName?.[0]}{agent.lastName?.[0]}</span>
              }
            </div>
            <div className="agent-hero-info">
              <h1>{agent.firstName} {agent.lastName}</h1>
              {ap.agency && <p className="agent-agency">{ap.agency}</p>}
              {ap.specializations?.length > 0 && (
                <div className="agent-specs">
                  {ap.specializations.map(s => <span key={s} className="badge badge-gold">{s}</span>)}
                </div>
              )}
              <div className="agent-contact">
                {agent.phone && <a href={`tel:${agent.phone}`} className="btn btn-primary">📞 {agent.phone}</a>}
                <a href={`mailto:${agent.email}`} className="btn btn-outline">✉️ Email Agent</a>
              </div>
            </div>
            <div className="agent-stats-mini">
              {ap.rating > 0 && <div className="asm-item"><span className="asm-val">⭐ {ap.rating}</span><span className="asm-lbl">{ap.reviewCount} reviews</span></div>}
              {ap.yearsOfExperience && <div className="asm-item"><span className="asm-val">{ap.yearsOfExperience}+</span><span className="asm-lbl">Years exp.</span></div>}
              <div className="asm-item"><span className="asm-val">{listings.length}</span><span className="asm-lbl">Active listings</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="container" style={{ paddingTop: 48, paddingBottom: 80 }}>
        {ap.bio && (
          <div className="agent-bio-section">
            <h2>About {agent.firstName}</h2>
            <p>{ap.bio}</p>
          </div>
        )}

        {listings.length > 0 && (
          <div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 32, marginBottom: 24 }}>Active Listings</h2>
            <div className="property-grid">
              {listings.map(p => <PropertyCard key={p._id} property={p} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
