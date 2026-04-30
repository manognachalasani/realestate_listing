const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Storage for property photos
const photoStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'realestate/photos',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1920, height: 1080, crop: 'limit', quality: 'auto' }],
  },
});

// Storage for floor plans
const floorPlanStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'realestate/floorplans',
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'webp'],
    transformation: [{ width: 2000, crop: 'limit', quality: 'auto' }],
  },
});

// Storage for agent avatars
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'realestate/avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face', quality: 'auto' }],
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and PDF are allowed.'), false);
  }
};

const uploadPhotos = multer({
  storage: photoStorage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024, files: 20 }, // 10MB per file, max 20 files
});

const uploadFloorPlan = multer({
  storage: floorPlanStorage,
  fileFilter,
  limits: { fileSize: 15 * 1024 * 1024, files: 1 },
});

const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

module.exports = { cloudinary, uploadPhotos, uploadFloorPlan, uploadAvatar };
