import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-main">
        <div className="container">
          <div className="footer-grid">
            {/* Brand */}
            <div className="footer-brand">
              <Link to="/" className="footer-logo">⌂ ESTATE<strong>HUB</strong></Link>
              <p className="footer-tagline">
                Connecting exceptional properties with discerning buyers since 2019.
              </p>
              <div className="footer-socials">
                {['Twitter', 'LinkedIn', 'Facebook', 'Instagram'].map(s => (
                  <a key={s} href="#" className="social-link" aria-label={s}>{s[0]}</a>
                ))}
              </div>
            </div>

            {/* Properties */}
            <div className="footer-col">
              <h4>Properties</h4>
              <Link to="/search">Browse All</Link>
              <Link to="/search?listingType=sale">For Sale</Link>
              <Link to="/search?listingType=rent">For Rent</Link>
              <Link to="/search?propertyType=apartment">Apartments</Link>
              <Link to="/search?propertyType=villa">Villas</Link>
            </div>

            {/* Company */}
            <div className="footer-col">
              <h4>Company</h4>
              <Link to="/agents">Our Agents</Link>
              <a href="#">About Us</a>
              <a href="#">Careers</a>
              <a href="#">Press</a>
              <a href="#">Contact</a>
            </div>

            {/* Resources */}
            <div className="footer-col">
              <h4>Resources</h4>
              <a href="#">Mortgage Calculator</a>
              <a href="#">Buying Guide</a>
              <a href="#">Selling Guide</a>
              <a href="#">Market Reports</a>
              <a href="#">Blog</a>
            </div>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container">
          <p>© {new Date().getFullYear()} EstateHub. All rights reserved.</p>
          <div className="footer-legal">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
