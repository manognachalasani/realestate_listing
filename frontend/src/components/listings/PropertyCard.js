import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../App';
import api from '../../services/api';
import toast from 'react-hot-toast';
import './PropertyCard.css';

const formatPrice = (price, listingType) => {
  const formatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(price);
  return listingType === 'rent' ? `${formatted}/mo` : formatted;
};

export default function PropertyCard({ property, onSaveToggle }) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(() =>
    user?.savedProperties?.includes(property._id)
  );

  const primaryPhoto = property.photos?.find(p => p.isPrimary)?.url || property.photos?.[0]?.url;
  const addr = property.address;

  const handleSave = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { toast.error('Please sign in to save properties'); return; }
    setSaving(true);
    try {
      const { data } = await api.post(`/auth/save-property/${property._id}`);
      setSaved(data.saved);
      toast.success(data.message);
      onSaveToggle?.(property._id, data.saved);
    } catch {
      toast.error('Could not save property');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Link to={`/properties/${property.slug || property._id}`} className="property-card">
      {/* Image */}
      <div className="prop-img-wrap">
        {primaryPhoto ? (
          <img src={primaryPhoto} alt={property.title} className="prop-img" loading="lazy" />
        ) : (
          <div className="prop-img-placeholder">
            <span>⌂</span>
          </div>
        )}

        {/* Overlays */}
        <div className="prop-badges">
          <span className={`badge ${property.listingType === 'rent' ? 'badge-gold' : 'badge-navy'}`}>
            {property.listingType === 'rent' ? 'For Rent' : 'For Sale'}
          </span>
          {property.virtualTourUrl && (
            <span className="badge badge-tour">🎬 Virtual Tour</span>
          )}
        </div>

        <button
          className={`save-btn ${saved ? 'saved' : ''}`}
          onClick={handleSave}
          disabled={saving}
          aria-label={saved ? 'Remove from saved' : 'Save property'}
        >
          <svg viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>

        {property.status !== 'active' && (
          <div className="prop-status-overlay">
            <span>{property.status.toUpperCase()}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="prop-content">
        <div className="prop-price">{formatPrice(property.price, property.listingType)}</div>
        <h3 className="prop-title">{property.title}</h3>
        <p className="prop-address">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          {addr?.city}, {addr?.state}
        </p>

        {/* Stats */}
        <div className="prop-stats">
          {property.bedrooms > 0 && (
            <span className="prop-stat">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16">
                <path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 16h20M6 8v8" />
              </svg>
              {property.bedrooms} Bed
            </span>
          )}
          {property.bathrooms > 0 && (
            <span className="prop-stat">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16">
                <path d="M4 12h16a1 1 0 0 1 1 1v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-3a1 1 0 0 1 1-1zM6 12V5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v.5" />
              </svg>
              {property.bathrooms} Bath
            </span>
          )}
          {property.area && (
            <span className="prop-stat">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M9 21V9" />
              </svg>
              {property.area.toLocaleString()} ft²
            </span>
          )}
        </div>

        {/* Agent info */}
        {property.agent && (
          <div className="prop-agent">
            <div className="agent-mini-avatar">
              {property.agent.avatar
                ? <img src={property.agent.avatar} alt="" />
                : <span>{property.agent.firstName?.[0]}</span>
              }
            </div>
            <span>{property.agent.firstName} {property.agent.lastName}</span>
          </div>
        )}
      </div>
    </Link>
  );
}
