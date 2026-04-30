import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { propertyAPI } from '../services/api';
import PropertyCard from '../components/listings/PropertyCard';
import './HomePage.css';

const HERO_STATS = [
  { value: '12,000+', label: 'Active Listings' },
  { value: '3,400+', label: 'Trusted Agents' },
  { value: '98%', label: 'Client Satisfaction' },
  { value: '$4.2B', label: 'Properties Sold' },
];

const FEATURES = [
  { icon: '🗺️', title: 'Interactive Map Search', desc: 'Explore properties on a live map. Find homes near your workplace, schools, or favorite spots.' },
  { icon: '🏦', title: 'Mortgage Calculator', desc: 'Instantly estimate your monthly repayments with our built-in calculator. Plan with confidence.' },
  { icon: '🎬', title: 'Virtual Tours', desc: 'Take immersive virtual tours from anywhere. Fall in love with your next home before stepping inside.' },
  { icon: '📩', title: 'Direct Agent Connect', desc: 'Enquire directly with listing agents and get fast, personal responses to your questions.' },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [listingType, setListingType] = useState('sale');
  const [featuredProperties, setFeaturedProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const { data } = await propertyAPI.getAll({ limit: 6, sortBy: 'views', sortOrder: 'desc' });
        setFeaturedProperties(data.properties);
      } catch { /* silent */ }
      finally { setLoading(false); }
    };
    fetchFeatured();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams({ listingType });
    if (searchQuery) params.set('city', searchQuery);
    navigate(`/search?${params}`);
  };

  return (
    <div className="home-page">
      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-bg">
          <div className="hero-overlay" />
          <img
            src="https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1920"
            alt="Luxury home"
            className="hero-img"
          />
        </div>

        <div className="hero-content">
          <div className="hero-badge">🏆 #1 Property Platform</div>
          <h1 className="hero-title">
            Find Your<br />
            <em>Perfect Home</em>
          </h1>
          <p className="hero-subtitle">
            Discover thousands of premium properties across the country.<br />
            From cozy apartments to grand estates — your dream home awaits.
          </p>

          {/* Search box */}
          <form className="hero-search" onSubmit={handleSearch}>
            <div className="search-type-tabs">
              <button type="button" className={`search-tab ${listingType === 'sale' ? 'active' : ''}`} onClick={() => setListingType('sale')}>Buy</button>
              <button type="button" className={`search-tab ${listingType === 'rent' ? 'active' : ''}`} onClick={() => setListingType('rent')}>Rent</button>
            </div>
            <div className="search-box">
              <div className="search-input-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                </svg>
                <input
                  type="text"
                  placeholder="Enter city, neighborhood, or ZIP code..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="hero-input"
                />
              </div>
              <button type="submit" className="btn btn-primary hero-search-btn">
                Search Properties
              </button>
            </div>
          </form>

          {/* Quick links */}
          <div className="hero-quick">
            <span>Popular:</span>
            {['New York', 'Los Angeles', 'Chicago', 'Miami', 'Austin'].map(city => (
              <button key={city} onClick={() => navigate(`/search?city=${city}&listingType=${listingType}`)} className="quick-link">
                {city}
              </button>
            ))}
          </div>
        </div>

        {/* Stats bar */}
        <div className="hero-stats">
          <div className="container">
            <div className="stats-grid">
              {HERO_STATS.map((s, i) => (
                <div key={i} className="stat-item">
                  <div className="stat-value">{s.value}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURED LISTINGS ── */}
      <section className="featured-section">
        <div className="container">
          <div className="section-header">
            <span className="section-label">Hand-Picked</span>
            <h2 className="section-title">Featured Properties</h2>
            <p className="section-subtitle">Explore our curated selection of exceptional homes and investment opportunities</p>
          </div>

          {loading ? (
            <div className="loading-screen"><div className="spinner" /></div>
          ) : (
            <div className="property-grid">
              {featuredProperties.map(property => (
                <PropertyCard key={property._id} property={property} />
              ))}
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: 48 }}>
            <button className="btn btn-outline btn-lg" onClick={() => navigate('/search')}>
              View All Properties →
            </button>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="features-section">
        <div className="container">
          <div className="section-header">
            <span className="section-label">Why EstateHub</span>
            <h2 className="section-title">Everything You Need</h2>
          </div>
          <div className="features-grid">
            {FEATURES.map((f, i) => (
              <div key={i} className="feature-card">
                <div className="feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-card">
            <div className="cta-content">
              <h2>Are You an Agent?</h2>
              <p>List your properties, manage leads, and grow your business with EstateHub's powerful agent tools.</p>
              <button className="btn btn-primary btn-lg" onClick={() => navigate('/register')}>
                Join as an Agent →
              </button>
            </div>
            <div className="cta-decorative">
              <div className="deco-circle c1" />
              <div className="deco-circle c2" />
              <div className="deco-text">⌂</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
