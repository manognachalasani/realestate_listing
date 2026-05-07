const express = require('express');
const router = express.Router();
const { 
  createEnquiry, 
  getAgentEnquiries, 
  getMyEnquiries, 
  updateEnquiryStatus, 
  getEnquiryStats
} = require('../controllers/enquiryController');

const { protect, optionalAuth, requireRole } = require('../middleware/auth');

// Public - Create enquiry (authenticated users get better experience)
router.post('/', optionalAuth, createEnquiry);

// Agent/Admin routes
router.get('/agent', protect, requireRole('agent', 'admin'), getAgentEnquiries);
router.get('/stats', protect, requireRole('agent', 'admin'), getEnquiryStats);
router.patch('/:id/status', protect, requireRole('agent', 'admin'), updateEnquiryStatus);

// Buyer routes - FIXED: Buyers should see their own enquiries
router.get('/my', protect, getMyEnquiries); // Removed buyer role restriction

module.exports = router;