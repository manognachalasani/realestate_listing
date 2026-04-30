import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';
import { propertyAPI, enquiryAPI } from '../services/api';
import toast from 'react-hot-toast';
import './AgentDashboardPage.css';

const StatCard = ({ icon, label, value, sub, color }) => (
  <div className="stat-card" style={{ '--accent': color }}>
    <div className="stat-icon">{icon}</div>
    <div className="stat-body">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  </div>
);

export default function AgentDashboardPage() {
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [enquiryStats, setEnquiryStats] = useState({ new: 0, total: 0, replied: 0 });
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [listingsRes, statsRes] = await Promise.all([
          propertyAPI.getMyListings({ limit: 50 }),
          enquiryAPI.getStats(),
        ]);
        setListings(listingsRes.data.properties);
        setEnquiryStats(statsRes.data);
      } catch (err) {
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      await propertyAPI.delete(id);
      setListings(prev => prev.filter(p => p._id !== id));
      toast.success('Listing deleted');
    } catch {
      toast.error('Could not delete listing');
    } finally {
      setDeleting(null);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await propertyAPI.update(id, { status: newStatus });
      setListings(prev => prev.map(p => p._id === id ? { ...p, status: newStatus } : p));
      toast.success(`Status updated to "${newStatus}"`);
    } catch {
      toast.error('Could not update status');
    }
  };

  const filtered = statusFilter ? listings.filter(p => p.status === statusFilter) : listings;
  const totalViews = listings.reduce((sum, p) => sum + (p.views || 0), 0);
  const activeCount = listings.filter(p => p.status === 'active').length;
  const soldCount = listings.filter(p => ['sold', 'rented'].includes(p.status)).length;

  if (loading) return <div className="loading-screen" style={{ minHeight: '80vh' }}><div className="spinner" /></div>;

  return (
    <div className="dashboard-page">
      <div className="container">
        {/* Header */}
        <div className="dashboard-header">
          <div>
            <h1>Agent Dashboard</h1>
            <p className="dashboard-greeting">Welcome back, <strong>{user?.firstName}</strong>! Here's your overview.</p>
          </div>
          <Link to="/agent/listings/new" className="btn btn-primary btn-lg">+ New Listing</Link>
        </div>

        {/* Stats */}
        <div className="stats-row">
          <StatCard icon="🏠" label="Active Listings" value={activeCount} sub={`${listings.length} total`} color="#c9a84c" />
          <StatCard icon="📩" label="New Enquiries" value={enquiryStats.new} sub={`${enquiryStats.total} total`} color="#4a7c59" />
          <StatCard icon="👁️" label="Total Views" value={totalViews.toLocaleString()} color="#6b7fd7" />
          <StatCard icon="🎉" label="Sold / Rented" value={soldCount} color="#e07b50" />
        </div>

        {/* Quick actions */}
        <div className="quick-actions">
          <Link to="/agent/enquiries" className="quick-action">
            <div className="qa-icon">📬</div>
            <div>
              <div className="qa-title">Manage Enquiries</div>
              <div className="qa-sub">{enquiryStats.new} new leads</div>
            </div>
            {enquiryStats.new > 0 && <span className="qa-badge">{enquiryStats.new}</span>}
          </Link>
          <Link to="/agent/listings/new" className="quick-action">
            <div className="qa-icon">➕</div>
            <div>
              <div className="qa-title">Create New Listing</div>
              <div className="qa-sub">Post a property</div>
            </div>
          </Link>
          <Link to={`/agents/${user?._id}`} className="quick-action">
            <div className="qa-icon">👤</div>
            <div>
              <div className="qa-title">View My Profile</div>
              <div className="qa-sub">Public agent page</div>
            </div>
          </Link>
        </div>

        {/* Listings table */}
        <div className="listings-section">
          <div className="section-toolbar">
            <h2>My Listings</h2>
            <div className="toolbar-right">
              <select className="form-select" style={{ width: 160 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="sold">Sold</option>
                <option value="rented">Rented</option>
                <option value="withdrawn">Withdrawn</option>
              </select>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: 48 }}>🏚️</div>
              <h3>No listings yet</h3>
              <p>Create your first property listing to start receiving enquiries.</p>
              <Link to="/agent/listings/new" className="btn btn-primary">Create First Listing</Link>
            </div>
          ) : (
            <div className="listings-table-wrap">
              <table className="listings-table">
                <thead>
                  <tr>
                    <th>Property</th>
                    <th>Price</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Views</th>
                    <th>Listed</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(property => {
                    const thumb = property.photos?.find(p => p.isPrimary)?.url || property.photos?.[0]?.url;
                    return (
                      <tr key={property._id} className={deleting === property._id ? 'deleting' : ''}>
                        <td>
                          <div className="table-property">
                            <div className="table-thumb">
                              {thumb ? <img src={thumb} alt="" /> : <span>⌂</span>}
                            </div>
                            <div>
                              <Link to={`/properties/${property.slug || property._id}`} className="table-title">
                                {property.title}
                              </Link>
                              <div className="table-addr">{property.address?.city}, {property.address?.state}</div>
                            </div>
                          </div>
                        </td>
                        <td className="price-cell">
                          ${property.price?.toLocaleString()}
                          {property.listingType === 'rent' && <small>/mo</small>}
                        </td>
                        <td><span className="badge badge-gold" style={{ textTransform: 'capitalize' }}>{property.propertyType}</span></td>
                        <td>
                          <select
                            className="status-select"
                            value={property.status}
                            onChange={e => handleStatusChange(property._id, e.target.value)}
                          >
                            <option value="active">Active</option>
                            <option value="pending">Pending</option>
                            <option value="sold">Sold</option>
                            <option value="rented">Rented</option>
                            <option value="withdrawn">Withdrawn</option>
                          </select>
                        </td>
                        <td>{property.views || 0}</td>
                        <td>{new Date(property.createdAt).toLocaleDateString()}</td>
                        <td>
                          <div className="table-actions">
                            <Link to={`/agent/listings/${property._id}/edit`} className="taction edit" title="Edit">✏️</Link>
                            <Link to={`/properties/${property.slug || property._id}`} className="taction view" title="View" target="_blank">👁️</Link>
                            <button className="taction delete" title="Delete" onClick={() => handleDelete(property._id, property.title)} disabled={deleting === property._id}>
                              {deleting === property._id ? '…' : '🗑️'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
