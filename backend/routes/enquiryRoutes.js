const express = require('express');
const router = express.Router();
const { createEnquiry, getAgentEnquiries, getMyEnquiries, updateEnquiryStatus, getEnquiryStats } = require('../controllers/enquiryController');
const { protect, optionalAuth, requireRole } = require('../middleware/auth');

router.post('/', optionalAuth, createEnquiry);
router.get('/agent', protect, requireRole('agent', 'admin'), getAgentEnquiries);
router.get('/stats', protect, requireRole('agent', 'admin'), getEnquiryStats);
router.get('/my', protect, requireRole('buyer'), getMyEnquiries);
router.patch('/:id/status', protect, requireRole('agent', 'admin'), updateEnquiryStatus);

module.exports = router;
