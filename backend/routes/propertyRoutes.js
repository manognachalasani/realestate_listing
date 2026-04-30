const express = require('express');
const router = express.Router();
const {
  getProperties, getNearbyProperties, getProperty,
  createProperty, updateProperty, deleteProperty,
  addPhotos, deletePhoto, getMyListings,
} = require('../controllers/propertyController');
const { protect, optionalAuth, requireRole } = require('../middleware/auth');
const { uploadPhotos } = require('../config/cloudinary');

// Public
router.get('/', optionalAuth, getProperties);
router.get('/nearby', getNearbyProperties);

// Private - agent
router.get('/my-listings', protect, requireRole('agent', 'admin'), getMyListings);

// Public - single property (must come after specific routes)
router.get('/:idOrSlug', optionalAuth, getProperty);

// Private - agent CRUD
router.post('/', protect, requireRole('agent', 'admin'), createProperty);
router.put('/:id', protect, requireRole('agent', 'admin'), updateProperty);
router.delete('/:id', protect, requireRole('agent', 'admin'), deleteProperty);

// Photos
router.post('/:id/photos', protect, requireRole('agent', 'admin'), uploadPhotos.array('photos', 20), addPhotos);
router.delete('/:id/photos/:photoId', protect, requireRole('agent', 'admin'), deletePhoto);

module.exports = router;
