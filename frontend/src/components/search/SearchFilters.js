import React, { useState } from 'react';
import './SearchFilters.css';

const PROPERTY_TYPES = ['house', 'apartment', 'condo', 'townhouse', 'villa', 'land', 'commercial', 'office'];
const AMENITIES_LIST = ['Swimming Pool', 'Gym', 'Parking', 'Garden', 'Fireplace', 'Balcony', 'Smart Home', 'Elevator', 'Concierge', 'Pet Friendly'];

export default function SearchFilters({ filters, onChange, onSearch, loading }) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handle = (field, value) => onChange({ ...filters, [field]: value });

  const toggleType = (type) => {
    const types = filters.propertyType ? filters.propertyType.split(',') : [];
    const idx = types.indexOf(type);
    if (idx > -1) types.splice(idx, 1); else types.push(type);
    handle('propertyType', types.join(','));
  };

  const toggleAmenity = (amenity) => {
    const list = filters.amenities ? filters.amenities.split(',') : [];
    const idx = list.indexOf(amenity);
    if (idx > -1) list.splice(idx, 1); else list.push(amenity);
    handle('amenities', list.join(','));
  };

  const selectedTypes = filters.propertyType ? filters.propertyType.split(',').filter(Boolean) : [];
  const selectedAmenities = filters.amenities ? filters.amenities.split(',').filter(Boolean) : [];

  return (
    <div className="search-filters">
      {/* Row 1: Main filters */}
      <div className="filters-main">
        {/* Location */}
        <div className="filter-group">
          <label>Location</label>
          <div className="input-with-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
            </svg>
            <input
              className="form-input"
              placeholder="City, state, or ZIP..."
              value={filters.city || ''}
              onChange={e => handle('city', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onSearch()}
            />
          </div>
        </div>

        {/* Listing type */}
        <div className="filter-group">
          <label>Type</label>
          <div className="toggle-tabs">
            <button className={`tab ${!filters.listingType || filters.listingType === 'both' ? 'active' : ''}`} onClick={() => handle('listingType', '')}>All</button>
            <button className={`tab ${filters.listingType === 'sale' ? 'active' : ''}`} onClick={() => handle('listingType', 'sale')}>Buy</button>
            <button className={`tab ${filters.listingType === 'rent' ? 'active' : ''}`} onClick={() => handle('listingType', 'rent')}>Rent</button>
          </div>
        </div>

        {/* Price range */}
        <div className="filter-group">
          <label>Price Range</label>
          <div className="price-inputs">
            <input
              className="form-input"
              type="number"
              placeholder="Min $"
              value={filters.minPrice || ''}
              onChange={e => handle('minPrice', e.target.value)}
            />
            <span className="price-sep">—</span>
            <input
              className="form-input"
              type="number"
              placeholder="Max $"
              value={filters.maxPrice || ''}
              onChange={e => handle('maxPrice', e.target.value)}
            />
          </div>
        </div>

        {/* Beds */}
        <div className="filter-group">
          <label>Beds</label>
          <div className="beds-btns">
            {['Any', '1+', '2+', '3+', '4+', '5+'].map((opt, i) => (
              <button
                key={opt}
                className={`beds-btn ${(filters.minBeds || '') === (i === 0 ? '' : String(i)) ? 'active' : ''}`}
                onClick={() => handle('minBeds', i === 0 ? '' : String(i))}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Search button */}
        <button className="btn btn-primary search-btn" onClick={onSearch} disabled={loading}>
          {loading ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
          )}
          Search
        </button>
      </div>

      {/* Property type chips */}
      <div className="type-chips">
        {PROPERTY_TYPES.map(type => (
          <button
            key={type}
            className={`type-chip ${selectedTypes.includes(type) ? 'active' : ''}`}
            onClick={() => toggleType(type)}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}

        <button className="type-chip advanced-toggle" onClick={() => setShowAdvanced(s => !s)}>
          {showAdvanced ? '▲ Less' : '▼ More Filters'}
        </button>
      </div>

      {/* Advanced filters */}
      {showAdvanced && (
        <div className="advanced-filters">
          {/* Area */}
          <div className="filter-group">
            <label>Area (ft²)</label>
            <div className="price-inputs">
              <input className="form-input" type="number" placeholder="Min ft²" value={filters.minArea || ''} onChange={e => handle('minArea', e.target.value)} />
              <span className="price-sep">—</span>
              <input className="form-input" type="number" placeholder="Max ft²" value={filters.maxArea || ''} onChange={e => handle('maxArea', e.target.value)} />
            </div>
          </div>

          {/* Furnished */}
          <div className="filter-group">
            <label>Furnished</label>
            <select className="form-select" value={filters.furnished || ''} onChange={e => handle('furnished', e.target.value)}>
              <option value="">Any</option>
              <option value="unfurnished">Unfurnished</option>
              <option value="semi-furnished">Semi-Furnished</option>
              <option value="fully-furnished">Fully Furnished</option>
            </select>
          </div>

          {/* Sort */}
          <div className="filter-group">
            <label>Sort By</label>
            <select className="form-select" value={`${filters.sortBy || 'createdAt'}_${filters.sortOrder || 'desc'}`}
              onChange={e => {
                const [by, order] = e.target.value.split('_');
                onChange({ ...filters, sortBy: by, sortOrder: order });
              }}>
              <option value="createdAt_desc">Newest First</option>
              <option value="createdAt_asc">Oldest First</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="area_desc">Largest First</option>
            </select>
          </div>

          {/* Amenities */}
          <div className="filter-group amenities-group">
            <label>Amenities</label>
            <div className="amenities-grid">
              {AMENITIES_LIST.map(a => (
                <label key={a} className="amenity-check">
                  <input
                    type="checkbox"
                    checked={selectedAmenities.includes(a)}
                    onChange={() => toggleAmenity(a)}
                  />
                  <span>{a}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
