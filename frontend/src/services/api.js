import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to all requests
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle global errors
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// ── Property API helpers ──────────────────────────────────────────────────────
export const propertyAPI = {
  getAll: (params) => api.get('/properties', { params }),
  getOne: (idOrSlug) => api.get(`/properties/${idOrSlug}`),
  getNearby: (params) => api.get('/properties/nearby', { params }),
  getMyListings: (params) => api.get('/properties/my-listings', { params }),
  create: (data) => api.post('/properties', data),
  update: (id, data) => api.put(`/properties/${id}`, data),
  delete: (id) => api.delete(`/properties/${id}`),
  addPhotos: (id, formData) => api.post(`/properties/${id}/photos`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deletePhoto: (id, photoId) => api.delete(`/properties/${id}/photos/${photoId}`),
};

// ── Enquiry API helpers ───────────────────────────────────────────────────────
export const enquiryAPI = {
  create: (data) => api.post('/enquiries', data),
  getAgentEnquiries: (params) => api.get('/enquiries/agent', { params }),
  getMyEnquiries: () => api.get('/enquiries/my'),
  updateStatus: (id, data) => api.patch(`/enquiries/${id}/status`, data),
  getStats: () => api.get('/enquiries/stats'),
};

// ── Upload API helpers ────────────────────────────────────────────────────────
export const uploadAPI = {
  photos: (formData) => api.post('/upload/photos', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  floorplan: (formData) => api.post('/upload/floorplan', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  avatar: (formData) => api.post('/upload/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

// ── Agent API helpers ─────────────────────────────────────────────────────────
export const agentAPI = {
  getAll: (params) => api.get('/agents', { params }),
  getOne: (id) => api.get(`/agents/${id}`),
};
