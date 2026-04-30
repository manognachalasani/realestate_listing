const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address'],
    },
    password: { type: String, required: true, minlength: 6, select: false },
    role: {
      type: String,
      enum: ['buyer', 'agent', 'admin'],
      default: 'buyer',
    },
    avatar: { type: String, default: '' },
    avatarPublicId: { type: String },
    phone: { type: String },

    // Agent-specific fields
    agentProfile: {
      licenseNumber: { type: String },
      agency: { type: String },
      bio: { type: String, maxlength: 1000 },
      specializations: [String],
      yearsOfExperience: { type: Number },
      website: { type: String },
      socialLinks: {
        linkedin: String,
        twitter: String,
        facebook: String,
        instagram: String,
      },
      rating: { type: Number, default: 0, min: 0, max: 5 },
      reviewCount: { type: Number, default: 0 },
      verified: { type: Boolean, default: false },
    },

    // Buyer-specific
    savedProperties: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Property' }],
    searchPreferences: {
      priceMin: Number,
      priceMax: Number,
      propertyTypes: [String],
      locations: [String],
      bedroomsMin: Number,
    },

    // Account
    isActive: { type: Boolean, default: true },
    emailVerified: { type: Boolean, default: false },
    lastLogin: { type: Date },
    notificationPreferences: {
      emailEnquiries: { type: Boolean, default: true },
      emailNewListings: { type: Boolean, default: false },
      emailMarketing: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

UserSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Hash password before save
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Hide sensitive fields in JSON output
UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('User', UserSchema);
