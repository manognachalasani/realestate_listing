// routes/uploadRoutes.js
const express = require('express');
const router = express.Router();
const { protect, requireRole } = require('../middleware/auth');
const { uploadPhotos, uploadFloorPlan, uploadAvatar } = require('../config/cloudinary');

router.post('/photos', protect, requireRole('agent', 'admin'), uploadPhotos.array('photos', 20), (req, res) => {
  const files = req.files.map(f => ({ url: f.path, publicId: f.filename }));
  res.json({ files });
});

router.post('/floorplan', protect, requireRole('agent', 'admin'), uploadFloorPlan.single('floorplan'), (req, res) => {
  res.json({ url: req.file.path, publicId: req.file.filename });
});

router.post('/avatar', protect, uploadAvatar.single('avatar'), (req, res) => {
  res.json({ url: req.file.path, publicId: req.file.filename });
});

module.exports = router;
