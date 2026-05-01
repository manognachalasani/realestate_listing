const express = require('express');
const router = express.Router();
const { protect, requireRole } = require('../middleware/auth');
const { uploadPhotos, uploadFloorPlan, uploadAvatar } = require('../config/cloudinary');

// Photo upload (max 20)
router.post('/photos', 
  protect, 
  requireRole('agent', 'admin'),
  (req, res, next) => {
    uploadPhotos.array('photos', 20)(req, res, function(err) {
      if (err) {
        // Handle Multer errors
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ 
            success: false, 
            message: 'File too large. Maximum size is 10MB per file' 
          });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({ 
            success: false, 
            message: 'Too many files. Maximum is 20 photos' 
          });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({ 
            success: false, 
            message: 'Unexpected file field' 
          });
        }
        next(err);
      }
      next();
    });
  },
  (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No files uploaded' 
      });
    }

    const files = req.files.map(f => ({ 
      url: f.path, 
      publicId: f.filename,
      originalName: f.originalname,
      size: f.size,
      mimetype: f.mimetype
    }));
    
    res.status(201).json({ 
      success: true, 
      files,
      message: `${files.length} file(s) uploaded successfully` 
    });
  }
);

// Floor plan upload (single file)
router.post('/floorplan', 
  protect, 
  requireRole('agent', 'admin'),
  (req, res, next) => {
    uploadFloorPlan.single('floorplan')(req, res, function(err) {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ 
            success: false, 
            message: 'Floor plan file too large. Maximum size is 10MB' 
          });
        }
        next(err);
      }
      next();
    });
  },
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No floor plan file uploaded' 
      });
    }

    res.status(201).json({ 
      success: true, 
      url: req.file.path, 
      publicId: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size
    });
  }
);

// Avatar upload (single file)
router.post('/avatar', 
  protect,
  (req, res, next) => {
    uploadAvatar.single('avatar')(req, res, function(err) {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ 
            success: false, 
            message: 'Avatar file too large. Maximum size is 5MB' 
          });
        }
        next(err);
      }
      next();
    });
  },
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No avatar file uploaded' 
      });
    }

    res.status(201).json({ 
      success: true, 
      url: req.file.path, 
      publicId: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size
    });
  }
);

// Delete uploaded file (future feature)
router.delete('/:publicId', 
  protect, 
  requireRole('agent', 'admin'),
  async (req, res) => {
    try {
      const cloudinary = require('../config/cloudinary');
      await cloudinary.uploader.destroy(req.params.publicId);
      res.json({ 
        success: true, 
        message: 'File deleted successfully' 
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to delete file' 
      });
    }
  }
);

module.exports = router;