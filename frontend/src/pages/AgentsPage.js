// src/pages/AgentsPage.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { agentAPI } from '../services/api';

export default function AgentsPage() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    agentAPI.getAll({ limit: 20 }).then(res => setAgents(res.data.agents)).finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ paddingTop: 100, paddingBottom: 80, minHeight: '100vh' }}>
      <div className="container">
        <div className="section-header">
          <span className="section-label">Our Team</span>
          <h1 className="section-title">Meet Our Agents</h1>
          <p className="section-subtitle">Expert professionals dedicated to finding your perfect property</p>
        </div>

        {loading ? (
          <div className="loading-screen"><div className="spinner" /></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 28 }}>
            {agents.map(agent => (
              <Link key={agent._id} to={`/agents/${agent._id}`} className="card" style={{ textDecoration: 'none', padding: 32, textAlign: 'center' }}>
                <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--gold)', color: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, margin: '0 auto 16px', overflow: 'hidden' }}>
                  {agent.avatar ? <img src={agent.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span>{agent.firstName?.[0]}{agent.lastName?.[0]}</span>}
                </div>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, marginBottom: 4 }}>{agent.firstName} {agent.lastName}</h3>
                {agent.agentProfile?.agency && <p style={{ color: 'var(--gold-dark)', fontSize: 14, marginBottom: 8 }}>{agent.agentProfile.agency}</p>}
                {agent.agentProfile?.rating > 0 && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>⭐ {agent.agentProfile.rating} · {agent.agentProfile.reviewCount} reviews</p>}
                {agent.agentProfile?.yearsOfExperience && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{agent.agentProfile.yearsOfExperience}+ years experience</p>}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 12 }}>
                  {agent.agentProfile?.specializations?.slice(0, 3).map(s => (
                    <span key={s} className="badge badge-gold" style={{ fontSize: 11 }}>{s}</span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
