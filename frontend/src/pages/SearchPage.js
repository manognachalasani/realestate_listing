import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { propertyAPI } from '../services/api';
import PropertyCard from '../components/listings/PropertyCard';
import PropertyMap from '../components/map/PropertyMap';
import SearchFilters from '../components/search/SearchFilters';
import './SearchPage.css';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [properties, setProperties] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('split'); // 'list' | 'map' | 'split'
  const [activeMapId, setActiveMapId] = useState(null);

  const [filters, setFilters] = useState({
    city: searchParams.get('city') || '',
    listingType: searchParams.get('listingType') || '',
    propertyType: searchParams.get('propertyType') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    minBeds: searchParams.get('minBeds') || '',
    amenities: '',
    furnished: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const [page, setPage] = useState(1);

  const fetchProperties = useCallback(async (currentPage = 1) => {
    setLoading(true);
    try {
      const params = { page: currentPage, limit: 12 };
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const { data } = await propertyAPI.getAll(params);
      setProperties(data.properties);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchProperties(page);
  }, [page]); // eslint-disable-line

  const handleSearch = () => {
    setPage(1);
    fetchProperties(1);
    // Sync URL params
    const params = {};
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
    setSearchParams(params);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="search-page">
      {/* Top bar */}
      <div className="search-topbar">
        <div className="container">
          <SearchFilters
            filters={filters}
            onChange={setFilters}
            onSearch={handleSearch}
            loading={loading}
          />
        </div>
      </div>

      {/* Results header */}
      <div className="results-header">
        <div className="container">
          <div className="results-meta">
            <span className="results-count">
              {loading ? 'Searching…' : `${pagination.total.toLocaleString()} properties found`}
              {filters.city && ` in "${filters.city}"`}
            </span>
          </div>

          <div className="view-toggles">
            <button className={`view-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')} title="List view">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
              </svg>
              Grid
            </button>
            <button className={`view-btn ${viewMode === 'split' ? 'active' : ''}`} onClick={() => setViewMode('split')} title="Split view">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <rect x="3" y="3" width="7" height="18" rx="1"/><rect x="14" y="3" width="7" height="18" rx="1"/>
              </svg>
              Map + List
            </button>
            <button className={`view-btn ${viewMode === 'map' ? 'active' : ''}`} onClick={() => setViewMode('map')} title="Map view">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
                <line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
              </svg>
              Map
            </button>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className={`search-content ${viewMode}`}>
        {/* Property list */}
        {viewMode !== 'map' && (
          <div className="results-panel">
            {loading ? (
              <div className="loading-screen"><div className="spinner" /></div>
            ) : properties.length === 0 ? (
              <div className="no-results">
                <div className="no-results-icon">🏚️</div>
                <h3>No properties found</h3>
                <p>Try adjusting your filters or search in a different area.</p>
              </div>
            ) : (
              <>
                <div className={`results-grid ${viewMode === 'split' ? 'split-grid' : 'full-grid'}`}>
                  {properties.map(property => (
                    <div
                      key={property._id}
                      onMouseEnter={() => setActiveMapId(property._id)}
                      onMouseLeave={() => setActiveMapId(null)}
                    >
                      <PropertyCard property={property} />
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {pagination.pages > 1 && (
                  <div className="pagination">
                    <button className="page-btn" onClick={() => handlePageChange(page - 1)} disabled={page === 1}>‹</button>
                    {Array.from({ length: Math.min(pagination.pages, 7) }, (_, i) => {
                      const p = i + 1;
                      return (
                        <button key={p} className={`page-btn ${page === p ? 'active' : ''}`} onClick={() => handlePageChange(p)}>
                          {p}
                        </button>
                      );
                    })}
                    <button className="page-btn" onClick={() => handlePageChange(page + 1)} disabled={page === pagination.pages}>›</button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Map panel */}
        {viewMode !== 'list' && (
          <div className="map-panel">
            <PropertyMap
              properties={properties}
              activeId={activeMapId}
              onMarkerClick={setActiveMapId}
            />
          </div>
        )}
      </div>
    </div>
  );
}
