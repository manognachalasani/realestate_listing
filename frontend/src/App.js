import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import api from './services/api';

// Pages
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import PropertyDetailPage from './pages/PropertyDetailPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AgentDashboardPage from './pages/AgentDashboardPage';
import CreateListingPage from './pages/CreateListingPage';
import EditListingPage from './pages/EditListingPage';
import AgentEnquiriesPage from './pages/AgentEnquiriesPage';
import AgentProfilePage from './pages/AgentProfilePage';
import SavedPropertiesPage from './pages/SavedPropertiesPage';
import AgentsPage from './pages/AgentsPage';

// Layout
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';

// ── Auth Context ──────────────────────────────────────────────────────────────
export const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    try {
      const { data } = await api.get('/auth/me');
      setUser(data);
    } catch {
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  const login = (userData, token) => {
    localStorage.setItem('token', token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const updateUser = (updated) => setUser(prev => ({ ...prev, ...updated }));

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser, refetchUser: fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
};

// ── Route Guards ──────────────────────────────────────────────────────────────
const PrivateRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="page-wrapper">
          <Navbar />
          <main className="main-content">
            <Routes>
              {/* Public */}
              <Route path="/" element={<HomePage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/properties/:idOrSlug" element={<PropertyDetailPage />} />
              <Route path="/agents" element={<AgentsPage />} />
              <Route path="/agents/:id" element={<AgentProfilePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Buyer protected */}
              <Route path="/saved" element={<PrivateRoute roles={['buyer', 'admin']}><SavedPropertiesPage /></PrivateRoute>} />

              {/* Agent protected */}
              <Route path="/agent/dashboard" element={<PrivateRoute roles={['agent', 'admin']}><AgentDashboardPage /></PrivateRoute>} />
              <Route path="/agent/listings/new" element={<PrivateRoute roles={['agent', 'admin']}><CreateListingPage /></PrivateRoute>} />
              <Route path="/agent/listings/:id/edit" element={<PrivateRoute roles={['agent', 'admin']}><EditListingPage /></PrivateRoute>} />
              <Route path="/agent/enquiries" element={<PrivateRoute roles={['agent', 'admin']}><AgentEnquiriesPage /></PrivateRoute>} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
          <Footer />
        </div>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '14px',
              borderRadius: '8px',
              border: '1px solid #e2ddd5',
            },
            success: { iconTheme: { primary: '#c9a84c', secondary: '#fff' } },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}
