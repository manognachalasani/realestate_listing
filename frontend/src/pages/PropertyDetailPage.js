import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { propertyAPI } from '../services/api';
import PropertyMap from '../components/map/PropertyMap';
import MortgageCalculator from '../components/mortgage/MortgageCalculator';
import EnquiryForm from '../components/enquiry/EnquiryForm';
import PropertyCard from '../components/listings/PropertyCard';
import { useAuth } from '../App';
import './PropertyDetailPage.css';

const formatPrice = (price, listingType) => {
  const f = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(price);
  return listingType === 'rent' ? `${f}/mo` : f;
};

export default function PropertyDetailPage() {
  const { idOrSlug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activePhoto, setActivePhoto] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [nearby, setNearby] = useState([]);
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const { data } = await propertyAPI.getOne(idOrSlug);
        setProperty(data);

        // Fetch nearby
        const [lng, lat] = data.location.coordinates;
        try {
          const { data: nearbyData } = await propertyAPI.getNearby({ lat, lng, radius: 10, limit: 3 });
          setNearby(nearbyData.filter(p => p._id !== data._id));
        } catch { /* silent */ }
      } catch {
        navigate('/search');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [idOrSlug, navigate]);

  if (loading) return <div className="loading-screen" style={{ minHeight: '80vh' }}><div className="spinner" /></div>;
  if (!property) return null;

  const photos = property.photos || [];
  const addr = property.address;
  const agent = property.agent;
  const [lng, lat] = property.location.coordinates;

  const TABS = ['details', 'floor plan', 'location', 'calculator'];

  return (
    <div className="detail-page">
      {/* Breadcrumb */}
      <div className="breadcrumb-bar">
        <div className="container">
          <nav className="breadcrumb">
            <Link to="/">Home</Link>
            <span>›</span>
            <Link to="/search">Properties</Link>
            <span>›</span>
            <Link to={`/search?city=${addr.city}`}>{addr.city}</Link>
            <span>›</span>
            <span>{property.title}</span>
          </nav>

          {user?.role === 'agent' && user._id === agent?._id && (
            <Link to={`/agent/listings/${property._id}/edit`} className="btn btn-outline btn-sm">
              ✏️ Edit Listing
            </Link>
          )}
        </div>
      </div>

      {/* Photo Gallery */}
      <div className="photo-gallery">
        <div className="gallery-main" onClick={() => setLightboxOpen(true)}>
          {photos.length > 0 ? (
            <img src={photos[activePhoto].url} alt={photos[activePhoto].caption || property.title} />
          ) : (
            <div className="no-photo">⌂</div>
          )}
          <div className="gallery-overlay">
            <button className="gallery-fullscreen">🔍 View All Photos ({photos.length})</button>
          </div>
          {property.virtualTourUrl && (
            <a href={property.virtualTourUrl} target="_blank" rel="noreferrer" className="virtual-tour-badge" onClick={e => e.stopPropagation()}>
              🎬 Virtual Tour
            </a>
          )}
        </div>

        {photos.length > 1 && (
          <div className="gallery-thumbs">
            {photos.slice(0, 5).map((photo, i) => (
              <div
                key={i}
                className={`gallery-thumb ${activePhoto === i ? 'active' : ''}`}
                onClick={() => setActivePhoto(i)}
              >
                <img src={photo.url} alt={photo.caption || `Photo ${i + 1}`} />
                {i === 4 && photos.length > 5 && (
                  <div className="thumb-more" onClick={() => setLightboxOpen(true)}>+{photos.length - 5}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div className="lightbox" onClick={() => setLightboxOpen(false)}>
          <button className="lightbox-close" onClick={() => setLightboxOpen(false)}>✕</button>
          <button className="lightbox-prev" onClick={e => { e.stopPropagation(); setActivePhoto(p => (p - 1 + photos.length) % photos.length); }}>‹</button>
          <img src={photos[activePhoto].url} alt="" onClick={e => e.stopPropagation()} />
          <button className="lightbox-next" onClick={e => { e.stopPropagation(); setActivePhoto(p => (p + 1) % photos.length); }}>›</button>
          <div className="lightbox-counter">{activePhoto + 1} / {photos.length}</div>
        </div>
      )}

      {/* Main content */}
      <div className="container">
        <div className="detail-layout">
          {/* Left col */}
          <div className="detail-main">
            {/* Header */}
            <div className="detail-header">
              <div className="detail-badges">
                <span className={`badge ${property.listingType === 'rent' ? 'badge-gold' : 'badge-navy'}`}>
                  {property.listingType === 'rent' ? 'For Rent' : 'For Sale'}
                </span>
                <span className="badge badge-gold">{property.propertyType}</span>
                {property.status !== 'active' && <span className="badge badge-red">{property.status}</span>}
              </div>

              <h1 className="detail-title">{property.title}</h1>

              <div className="detail-location">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                </svg>
                {addr.street}, {addr.city}, {addr.state} {addr.zipCode}
                {property.neighborhood && <span className="neighborhood"> · {property.neighborhood}</span>}
              </div>

              <div className="detail-price">{formatPrice(property.price, property.listingType)}</div>

              {/* Quick stats */}
              <div className="detail-stats">
                {property.bedrooms > 0 && <div className="dstat"><span className="dstat-val">{property.bedrooms}</span><span className="dstat-lbl">Bedrooms</span></div>}
                {property.bathrooms > 0 && <div className="dstat"><span className="dstat-val">{property.bathrooms}</span><span className="dstat-lbl">Bathrooms</span></div>}
                {property.garages > 0 && <div className="dstat"><span className="dstat-val">{property.garages}</span><span className="dstat-lbl">Garages</span></div>}
                {property.area && <div className="dstat"><span className="dstat-val">{property.area.toLocaleString()}</span><span className="dstat-lbl">Sq Ft</span></div>}
                {property.yearBuilt && <div className="dstat"><span className="dstat-val">{property.yearBuilt}</span><span className="dstat-lbl">Year Built</span></div>}
                {property.floors && <div className="dstat"><span className="dstat-val">{property.floors}</span><span className="dstat-lbl">Floors</span></div>}
              </div>
            </div>

            {/* Tabs */}
            <div className="detail-tabs">
              {TABS.map(tab => (
                <button
                  key={tab}
                  className={`detail-tab ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="tab-content">
              {activeTab === 'details' && (
                <div className="animate-fade">
                  <div className="description-section">
                    <h2>About This Property</h2>
                    <p className="description-text">{property.description}</p>
                  </div>

                  {/* Property info grid */}
                  <div className="info-grid">
                    <h2>Property Details</h2>
                    <div className="info-table">
                      <InfoRow label="Property Type" value={property.propertyType} />
                      <InfoRow label="Listing Type" value={property.listingType} />
                      <InfoRow label="Status" value={property.status} />
                      {property.furnished && <InfoRow label="Furnished" value={property.furnished} />}
                      {property.area && <InfoRow label="Living Area" value={`${property.area.toLocaleString()} sq ft`} />}
                      {property.lotSize && <InfoRow label="Lot Size" value={`${property.lotSize.toLocaleString()} sq ft`} />}
                      {property.yearBuilt && <InfoRow label="Year Built" value={property.yearBuilt} />}
                      {property.pricePerSqft && <InfoRow label="Price/sq ft" value={`$${property.pricePerSqft}`} />}
                      {property.hoaFees > 0 && <InfoRow label="HOA Fees" value={`$${property.hoaFees}/mo`} />}
                      {property.propertyTax > 0 && <InfoRow label="Property Tax" value={`$${property.propertyTax}/yr`} />}
                    </div>
                  </div>

                  {/* Amenities */}
                  {property.amenities?.length > 0 && (
                    <div className="amenities-section">
                      <h2>Amenities & Features</h2>
                      <div className="amenities-chips">
                        {property.amenities.map(a => (
                          <span key={a} className="amenity-chip">✓ {a}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'floor plan' && (
                <div className="animate-fade floorplan-section">
                  <h2>Floor Plan</h2>
                  {property.floorPlanUrl ? (
                    <div className="floorplan-wrap">
                      <img src={property.floorPlanUrl} alt="Floor Plan" />
                      <a href={property.floorPlanUrl} download className="btn btn-outline btn-sm" style={{ marginTop: 16 }}>
                        ⬇ Download Floor Plan
                      </a>
                    </div>
                  ) : (
                    <div className="no-floorplan">
                      <div style={{ fontSize: 48 }}>📐</div>
                      <p>No floor plan available for this property.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'location' && (
                <div className="animate-fade">
                  <h2>Location</h2>
                  <p className="detail-location" style={{ marginBottom: 20 }}>
                    📍 {addr.street}, {addr.city}, {addr.state} {addr.zipCode}
                  </p>
                  <div style={{ height: 420, borderRadius: 12, overflow: 'hidden' }}>
                    <PropertyMap
                      properties={[property]}
                      center={[lat, lng]}
                      zoom={14}
                    />
                  </div>
                  {/* Print brochure link */}
                  <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
                    <a
                      href={`http://localhost:8080/brochure?propertyId=${property._id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-outline btn-sm"
                    >
                      🖨️ Print Brochure (PDF)
                    </a>
                    {property.virtualTourUrl && (
                      <a href={property.virtualTourUrl} target="_blank" rel="noreferrer" className="btn btn-dark btn-sm">
                        🎬 Virtual Tour
                      </a>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'calculator' && (
                <div className="animate-fade">
                  <MortgageCalculator propertyPrice={property.price} />
                </div>
              )}
            </div>

            {/* Nearby properties */}
            {nearby.length > 0 && (
              <div className="nearby-section">
                <h2>Nearby Properties</h2>
                <div className="property-grid">
                  {nearby.map(p => <PropertyCard key={p._id} property={p} />)}
                </div>
              </div>
            )}
          </div>

          {/* Right col - Sticky enquiry */}
          <div className="detail-sidebar">
            <EnquiryForm property={property} agent={agent} />
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="info-row">
      <span className="info-label">{label}</span>
      <span className="info-value" style={{ textTransform: 'capitalize' }}>{value}</span>
    </div>
  );
}
