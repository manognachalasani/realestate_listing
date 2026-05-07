const express = require('express');
const router = express.Router();
const {
  getProperties,
  getNearbyProperties,
  getProperty,
  createProperty,
  updateProperty,
  deleteProperty,
  addPhotos,
  deletePhoto,
  getMyListings
} = require('../controllers/propertyController');
const { protect, optionalAuth, requireRole } = require('../middleware/auth');
const { uploadPhotos } = require('../config/cloudinary');

// CRITICAL: Specific routes MUST come BEFORE parameterized routes

// Public routes - No ID parameter
router.get('/nearby', getNearbyProperties);  // Must be before /:idOrSlugS

// Main public route
router.get('/', optionalAuth, getProperties);

// Protected agent routes - No ID parameter  
router.get('/my-listings', protect, requireRole('agent', 'admin'), getMyListings);
router.post('/', protect, requireRole('agent', 'admin'), createProperty);

// Routes with property ID parameter
router.get('/:idOrSlug', optionalAuth, getProperty);
router.put('/:id', protect, requireRole('agent', 'admin'), updateProperty);
router.delete('/:id', protect, requireRole('agent', 'admin'), deleteProperty);

// Photo routes
router.post('/:id/photos', protect, requireRole('agent', 'admin'), uploadPhotos.array('photos', 20), addPhotos);
router.delete('/:id/photos/:photoId', protect, requireRole('agent', 'admin'), deletePhoto);

// Favorites
router.get('/:id/enquiries', protect, requireRole('agent', 'admin'), getPropertyEnquiries);

// Additional helper route
async function getPropertyEnquiries(req, res) {
  // This would be implemented in propertyController
  const Enquiry = require('../models/Enquiry');
  const enquiries = await Enquiry.find({ property: req.params.id })
    .populate('buyer', 'firstName lastName email phone')
    .sort('-createdAt');
  res.json({ success: true, enquiries });
}

module.exports = router;