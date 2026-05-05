const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { protect, requireRole } = require('../middleware/auth');
const {
  getDashboard,
  getPropertyAnalytics,
  getUserAnalytics,
  listUsers,
  getUserById,
  toggleUserStatus,
  changeUserRole,
  deleteUser,
  listAllProperties,
  getPropertyById,
  overridePropertyStatus,
  deletePropertyAdmin,
  listPendingAgents,
  verifyAgent,
  unverifyAgent,
  listAllEnquiries,
  deleteEnquiryAdmin,
  getAuditLog,
} = require('../controllers/adminController');

// Tighter rate limit for admin routes
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { error: 'Too many admin requests, please slow down.' },
});

router.use(adminLimiter);
router.use(protect, requireRole('admin'));

// ── Dashboard & Analytics ─────────────────────────────────────────────────────
router.get('/dashboard', getDashboard);
router.get('/analytics/properties', getPropertyAnalytics);
router.get('/analytics/users', getUserAnalytics);

// ── User Management ───────────────────────────────────────────────────────────
router.get('/users', listUsers);
router.get('/users/:id', getUserById);
router.patch('/users/:id/status', toggleUserStatus);
router.patch('/users/:id/role', changeUserRole);
router.delete('/users/:id', deleteUser);

// ── Property Moderation ───────────────────────────────────────────────────────
router.get('/properties', listAllProperties);
router.get('/properties/:id', getPropertyById);
router.patch('/properties/:id/status', overridePropertyStatus);
router.delete('/properties/:id', deletePropertyAdmin);

// ── Agent Verification ────────────────────────────────────────────────────────
router.get('/agents/pending', listPendingAgents);
router.patch('/agents/:id/verify', verifyAgent);
router.patch('/agents/:id/unverify', unverifyAgent);

// ── Enquiry Oversight ─────────────────────────────────────────────────────────
router.get('/enquiries', listAllEnquiries);
router.delete('/enquiries/:id', deleteEnquiryAdmin);

// ── Audit Log ─────────────────────────────────────────────────────────────────
router.get('/audit-log', getAuditLog);

module.exports = router;
