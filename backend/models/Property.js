const mongoose = require('mongoose');

const PhotoSchema = new mongoose.Schema({
  url: { type: String, required: true },
  publicId: { type: String },
  caption: { type: String, default: '' },
  isPrimary: { type: Boolean, default: false },
});

const AmenitySchema = new mongoose.Schema({
  name: { type: String, required: true },
  icon: { type: String, default: '' },
});

const PropertySchema = new mongoose.Schema(
  {
    // ── Basic Info ──────────────────────────────
    title: {
      type: String,
      required: [true, 'Property title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    description: {
      type: String,
      required: [true, 'Property description is required'],
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    propertyType: {
      type: String,
      required: true,
      enum: ['house', 'apartment', 'condo', 'townhouse', 'villa', 'land', 'commercial', 'office'],
    },
    listingType: {
      type: String,
      required: true,
      enum: ['sale', 'rent'],
    },
    status: {
      type: String,
      enum: ['active', 'pending', 'sold', 'rented', 'withdrawn'],
      default: 'active',
    },

    // ── Pricing ─────────────────────────────────
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    pricePerSqft: { type: Number },
    currency: { type: String, default: 'USD' },

    // ── Property Details ────────────────────────
    bedrooms: { type: Number, min: 0, default: 0 },
    bathrooms: { type: Number, min: 0, default: 0 },
    garages: { type: Number, min: 0, default: 0 },
    area: { type: Number, min: 0 }, // square feet
    lotSize: { type: Number, min: 0 },
    yearBuilt: { type: Number },
    floors: { type: Number, min: 1, default: 1 },
    furnished: {
      type: String,
      enum: ['unfurnished', 'semi-furnished', 'fully-furnished', 'not-applicable'],
      default: 'unfurnished',
    },

    // ── Location ────────────────────────────────
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zipCode: { type: String, required: true },
      country: { type: String, required: true, default: 'USA' },
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
        index: '2dsphere',
      },
    },
    neighborhood: { type: String },

    // ── Media ───────────────────────────────────
    photos: [PhotoSchema],
    floorPlanUrl: { type: String },
    floorPlanPublicId: { type: String },
    virtualTourUrl: { type: String },
    videoUrl: { type: String },

    // ── Amenities ───────────────────────────────
    amenities: [String],
    features: [String],

    // ── Agent/Owner ─────────────────────────────
    agent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // ── SEO / Slugs ─────────────────────────────
    slug: { type: String, unique: true },

    // ── Stats ────────────────────────────────────
    views: { type: Number, default: 0 },
    favouritedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // ── HOA / Additional Costs ──────────────────
    hoaFees: { type: Number, default: 0 },
    propertyTax: { type: Number, default: 0 },

    // ── Timestamps ──────────────────────────────
    listedAt: { type: Date, default: Date.now },
    soldAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Indexes ─────────────────────────────────────────────────────────────────
PropertySchema.index({ 'location.coordinates': '2dsphere' });
PropertySchema.index({ price: 1 });
PropertySchema.index({ propertyType: 1 });
PropertySchema.index({ listingType: 1 });
PropertySchema.index({ 'address.city': 1 });
PropertySchema.index({ status: 1 });
PropertySchema.index({ agent: 1 });
PropertySchema.index({ slug: 1 });
PropertySchema.index({ createdAt: -1 });

// ── Text search index ────────────────────────────────────────────────────────
PropertySchema.index({
  title: 'text',
  description: 'text',
  neighborhood: 'text',
  'address.city': 'text',
  'address.state': 'text',
});

// ── Virtuals ─────────────────────────────────────────────────────────────────
PropertySchema.virtual('primaryPhoto').get(function () {
  const primary = this.photos.find(p => p.isPrimary);
  return primary ? primary.url : (this.photos[0]?.url || null);
});

PropertySchema.virtual('fullAddress').get(function () {
  const { street, city, state, zipCode, country } = this.address;
  return `${street}, ${city}, ${state} ${zipCode}, ${country}`;
});

PropertySchema.virtual('enquiries', {
  ref: 'Enquiry',
  localField: '_id',
  foreignField: 'property',
  count: true,
});

// ── Pre-save hooks ────────────────────────────────────────────────────────────
PropertySchema.pre('save', function (next) {
  // Auto-generate slug
  if (!this.slug || this.isModified('title')) {
    this.slug =
      this.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim() +
      '-' +
      Date.now().toString(36);
  }

  // Auto-set primary photo
  if (this.photos.length > 0 && !this.photos.some(p => p.isPrimary)) {
    this.photos[0].isPrimary = true;
  }

  // Auto-compute price per sqft
  if (this.area && this.price) {
    this.pricePerSqft = Math.round(this.price / this.area);
  }

  next();
});

module.exports = mongoose.model('Property', PropertySchema);
