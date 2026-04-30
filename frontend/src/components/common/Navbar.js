import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../App';
import './Navbar.css';

const NavIcon = ({ d, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMenuOpen(false); }, [location]);

  useEffect(() => {
    const handleClick = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
    setDropOpen(false);
  };

  const isHome = location.pathname === '/';

  return (
    <nav className={`navbar ${scrolled || !isHome ? 'scrolled' : ''} ${menuOpen ? 'menu-open' : ''}`}>
      <div className="nav-container">
        {/* Logo */}
        <Link to="/" className="nav-logo">
          <span className="logo-icon">⌂</span>
          <span>ESTATE<strong>HUB</strong></span>
        </Link>

        {/* Desktop nav links */}
        <div className="nav-links">
          <Link to="/search" className={`nav-link ${location.pathname === '/search' ? 'active' : ''}`}>
            Buy / Rent
          </Link>
          <Link to="/search?listingType=rent" className="nav-link">Rentals</Link>
          <Link to="/agents" className="nav-link">Agents</Link>
          {user?.role === 'agent' && (
            <Link to="/agent/listings/new" className="btn btn-outline btn-sm">+ New Listing</Link>
          )}
        </div>

        {/* Auth section */}
        <div className="nav-auth">
          {user ? (
            <div className="nav-user" ref={dropRef}>
              <button className="user-trigger" onClick={() => setDropOpen(o => !o)}>
                <div className="user-avatar">
                  {user.avatar
                    ? <img src={user.avatar} alt={user.firstName} />
                    : <span>{user.firstName?.[0]}{user.lastName?.[0]}</span>
                  }
                </div>
                <span className="user-name">{user.firstName}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>

              {dropOpen && (
                <div className="user-dropdown">
                  <div className="dropdown-header">
                    <span className="dropdown-name">{user.firstName} {user.lastName}</span>
                    <span className="dropdown-role">{user.role}</span>
                  </div>
                  <div className="dropdown-divider" />
                  {user.role === 'agent' ? (
                    <>
                      <Link to="/agent/dashboard" className="dropdown-item" onClick={() => setDropOpen(false)}>Dashboard</Link>
                      <Link to="/agent/enquiries" className="dropdown-item" onClick={() => setDropOpen(false)}>Enquiries</Link>
                      <Link to="/agent/listings/new" className="dropdown-item" onClick={() => setDropOpen(false)}>New Listing</Link>
                    </>
                  ) : (
                    <Link to="/saved" className="dropdown-item" onClick={() => setDropOpen(false)}>Saved Properties</Link>
                  )}
                  <div className="dropdown-divider" />
                  <button className="dropdown-item dropdown-logout" onClick={handleLogout}>Sign Out</button>
                </div>
              )}
            </div>
          ) : (
            <div className="nav-auth-btns">
              <Link to="/login" className="btn btn-ghost btn-sm">Sign In</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Register</Link>
            </div>
          )}
        </div>

        {/* Mobile hamburger */}
        <button className="hamburger" onClick={() => setMenuOpen(o => !o)} aria-label="Menu">
          <span /><span /><span />
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="mobile-menu">
          <Link to="/search" className="mobile-link">Buy / Rent</Link>
          <Link to="/agents" className="mobile-link">Agents</Link>
          {user ? (
            <>
              {user.role === 'agent' ? (
                <>
                  <Link to="/agent/dashboard" className="mobile-link">Dashboard</Link>
                  <Link to="/agent/enquiries" className="mobile-link">Enquiries</Link>
                  <Link to="/agent/listings/new" className="mobile-link">+ New Listing</Link>
                </>
              ) : (
                <Link to="/saved" className="mobile-link">Saved Properties</Link>
              )}
              <button className="mobile-link mobile-logout" onClick={handleLogout}>Sign Out</button>
            </>
          ) : (
            <div className="mobile-auth">
              <Link to="/login" className="btn btn-ghost">Sign In</Link>
              <Link to="/register" className="btn btn-primary">Register</Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
