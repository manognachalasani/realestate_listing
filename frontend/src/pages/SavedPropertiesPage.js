// src/pages/SavedPropertiesPage.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import api from '../services/api';
import PropertyCard from '../components/listings/PropertyCard';

export default function SavedPropertiesPage() {
  const { user } = useAuth();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/auth/me').then(res => {
      setProperties(res.data.savedProperties || []);
    }).finally(() => setLoading(false));
  }, []);

  const handleSaveToggle = (id, saved) => {
    if (!saved) setProperties(prev => prev.filter(p => p._id !== id));
  };

  return (
    <div style={{ paddingTop: 100, paddingBottom: 80, minHeight: '100vh' }}>
      <div className="container">
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 40 }}>Saved Properties</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>
            {user?.firstName}'s saved listings · {properties.length} properties
          </p>
        </div>

        {loading ? (
          <div className="loading-screen"><div className="spinner" /></div>
        ) : properties.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>❤️</div>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, marginBottom: 8 }}>No saved properties yet</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Browse listings and click the heart icon to save your favourites.</p>
            <a href="/search" className="btn btn-primary btn-lg">Browse Properties</a>
          </div>
        ) : (
          <div className="property-grid">
            {properties.map(property => (
              <PropertyCard key={property._id} property={property} onSaveToggle={handleSaveToggle} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
