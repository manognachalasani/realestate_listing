const asyncHandler = require('express-async-handler');
const Property = require('../models/Property');
const { cloudinary } = require('../config/cloudinary');

// @desc    Get all properties with search, filter, and geospatial
// @route   GET /api/properties
// @access  Public
const getProperties = asyncHandler(async (req, res) => {
  const {
    q,              // text search
    city,
    state,
    propertyType,
    listingType,
    minPrice,
    maxPrice,
    minBeds,
    maxBeds,
    minBaths,
    minArea,
    maxArea,
    amenities,
    furnished,
    status = 'active',
    sortBy = 'createdAt',
    sortOrder = 'desc',
    page = 1,
    limit = 12,
    lat,            // for geospatial
    lng,
    radius = 10,    // km
  } = req.query;

  const query = { status };
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  // ── Text search ───────────────────────────────
  if (q) {
    query.$text = { $search: q };
  }

  // ── Location filters ──────────────────────────
  if (city) query['address.city'] = { $regex: city, $options: 'i' };
  if (state) query['address.state'] = { $regex: state, $options: 'i' };

  // ── Property type & listing type ──────────────
  if (propertyType) query.propertyType = { $in: propertyType.split(',') };
  if (listingType) query.listingType = listingType;

  // ── Price range ───────────────────────────────
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }

  // ── Bedrooms / Bathrooms ──────────────────────
  if (minBeds) query.bedrooms = { $gte: Number(minBeds) };
  if (maxBeds) query.bedrooms = { ...query.bedrooms, $lte: Number(maxBeds) };
  if (minBaths) query.bathrooms = { $gte: Number(minBaths) };

  // ── Area ──────────────────────────────────────
  if (minArea || maxArea) {
    query.area = {};
    if (minArea) query.area.$gte = Number(minArea);
    if (maxArea) query.area.$lte = Number(maxArea);
  }

  // ── Amenities ─────────────────────────────────
  if (amenities) {
    const amenityList = amenities.split(',').map(a => a.trim());
    query.amenities = { $all: amenityList };
  }

  if (furnished) query.furnished = furnished;

  // ── Geospatial query (overrides city/state if coords given) ──
  if (lat && lng) {
    query['location'] = {
      $near: {
        $geometry: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
        $maxDistance: Number(radius) * 1000, // convert km to meters
      },
    };
  }

  const skip = (Number(page) - 1) * Number(limit);
  const limitNum = Math.min(Number(limit), 50);

  const [properties, total] = await Promise.all([
    Property.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .populate('agent', 'firstName lastName avatar phone email agentProfile'),
    Property.countDocuments(query),
  ]);

  res.json({
    properties,
    pagination: {
      page: Number(page),
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  });
});

// @desc    Get nearby properties (within radius)
// @route   GET /api/properties/nearby
// @access  Public
const getNearbyProperties = asyncHandler(async (req, res) => {
  const { lat, lng, radius = 5, limit = 6 } = req.query;

  if (!lat || !lng) {
    res.status(400);
    throw new Error('Latitude and longitude are required');
  }

  const properties = await Property.find({
    status: 'active',
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
        $maxDistance: Number(radius) * 1000,
      },
    },
  })
    .limit(Number(limit))
    .populate('agent', 'firstName lastName avatar phone');

  res.json(properties);
});

// @desc    Get single property by ID or slug
// @route   GET /api/properties/:idOrSlug
// @access  Public
const getProperty = asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params;
  let property;

  // Try by ID first, then slug
  if (idOrSlug.match(/^[0-9a-fA-F]{24}$/)) {
    property = await Property.findById(idOrSlug)
      .populate('agent', 'firstName lastName avatar phone email agentProfile');
  } else {
    property = await Property.findOne({ slug: idOrSlug })
      .populate('agent', 'firstName lastName avatar phone email agentProfile');
  }

  if (!property) {
    res.status(404);
    throw new Error('Property not found');
  }

  // Increment view count (non-blocking)
  Property.findByIdAndUpdate(property._id, { $inc: { views: 1 } }).exec();

  res.json(property);
});

// @desc    Create a new property listing
// @route   POST /api/properties
// @access  Private (agents only)
const createProperty = asyncHandler(async (req, res) => {
  const {
    title, description, propertyType, listingType, price,
    bedrooms, bathrooms, garages, area, lotSize, yearBuilt, floors, furnished,
    street, city, state, zipCode, country,
    latitude, longitude,
    neighborhood, amenities, features,
    virtualTourUrl, videoUrl, floorPlanUrl,
    hoaFees, propertyTax,
  } = req.body;

  if (!latitude || !longitude) {
    res.status(400);
    throw new Error('Property coordinates (latitude, longitude) are required');
  }

  const property = await Property.create({
    title,
    description,
    propertyType,
    listingType,
    price,
    bedrooms,
    bathrooms,
    garages,
    area,
    lotSize,
    yearBuilt,
    floors,
    furnished,
    address: { street, city, state, zipCode, country: country || 'USA' },
    location: {
      type: 'Point',
      coordinates: [Number(longitude), Number(latitude)],
    },
    neighborhood,
    amenities: Array.isArray(amenities) ? amenities : amenities?.split(',') || [],
    features: Array.isArray(features) ? features : features?.split(',') || [],
    virtualTourUrl,
    videoUrl,
    floorPlanUrl,
    hoaFees,
    propertyTax,
    agent: req.user._id,
  });

  await property.populate('agent', 'firstName lastName avatar phone email');

  res.status(201).json(property);
});

// @desc    Update a property
// @route   PUT /api/properties/:id
// @access  Private (owner agent or admin)
const updateProperty = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id);

  if (!property) {
    res.status(404);
    throw new Error('Property not found');
  }

  if (property.agent.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to update this listing');
  }

  // Handle location update
  if (req.body.latitude && req.body.longitude) {
    req.body.location = {
      type: 'Point',
      coordinates: [Number(req.body.longitude), Number(req.body.latitude)],
    };
    delete req.body.latitude;
    delete req.body.longitude;
  }

  // Handle address
  if (req.body.street || req.body.city || req.body.state || req.body.zipCode) {
    req.body.address = {
      street: req.body.street || property.address.street,
      city: req.body.city || property.address.city,
      state: req.body.state || property.address.state,
      zipCode: req.body.zipCode || property.address.zipCode,
      country: req.body.country || property.address.country,
    };
  }

  const updatedProperty = await Property.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate('agent', 'firstName lastName avatar phone email');

  res.json(updatedProperty);
});

// @desc    Delete a property
// @route   DELETE /api/properties/:id
// @access  Private (owner agent or admin)
const deleteProperty = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id);

  if (!property) {
    res.status(404);
    throw new Error('Property not found');
  }

  if (property.agent.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to delete this listing');
  }

  // Delete Cloudinary assets
  const deletePromises = property.photos
    .filter(p => p.publicId)
    .map(p => cloudinary.uploader.destroy(p.publicId));

  if (property.floorPlanPublicId) {
    deletePromises.push(cloudinary.uploader.destroy(property.floorPlanPublicId));
  }

  await Promise.allSettled(deletePromises);
  await property.deleteOne();

  res.json({ message: 'Property deleted successfully' });
});

// @desc    Add photos to existing property
// @route   POST /api/properties/:id/photos
// @access  Private (owner agent)
const addPhotos = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id);

  if (!property) {
    res.status(404);
    throw new Error('Property not found');
  }

  if (property.agent.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized');
  }

  const newPhotos = req.files.map((file, idx) => ({
    url: file.path,
    publicId: file.filename,
    isPrimary: property.photos.length === 0 && idx === 0,
  }));

  property.photos.push(...newPhotos);
  await property.save();

  res.json({ photos: property.photos });
});

// @desc    Delete a photo from property
// @route   DELETE /api/properties/:id/photos/:photoId
// @access  Private (owner agent)
const deletePhoto = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id);

  if (!property) {
    res.status(404);
    throw new Error('Property not found');
  }

  const photo = property.photos.id(req.params.photoId);
  if (!photo) {
    res.status(404);
    throw new Error('Photo not found');
  }

  if (photo.publicId) {
    await cloudinary.uploader.destroy(photo.publicId).catch(() => {});
  }

  photo.deleteOne();
  if (property.photos.length > 0 && !property.photos.some(p => p.isPrimary)) {
    property.photos[0].isPrimary = true;
  }

  await property.save();
  res.json({ photos: property.photos });
});

// @desc    Get agent's own listings
// @route   GET /api/properties/my-listings
// @access  Private (agents)
const getMyListings = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;
  const query = { agent: req.user._id };
  if (status) query.status = status;

  const skip = (Number(page) - 1) * Number(limit);
  const [properties, total] = await Promise.all([
    Property.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Property.countDocuments(query),
  ]);

  res.json({
    properties,
    pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
  });
});

module.exports = {
  getProperties,
  getNearbyProperties,
  getProperty,
  createProperty,
  updateProperty,
  deleteProperty,
  addPhotos,
  deletePhoto,
  getMyListings,
};
