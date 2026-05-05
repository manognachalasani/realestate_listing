const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const UserSchema = new mongoose.Schema(
  {
    firstName: { 
      type: String, 
      required: [true, 'First name is required'], 
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters'],
    },
    lastName: { 
      type: String, 
      required: [true, 'Last name is required'], 
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address'],
    },
    password: { 
      type: String, 
      required: [true, 'Password is required'], 
      minlength: [6, 'Password must be at least 6 characters'], 
      select: false,
    },
    role: {
      type: String,
      enum: ['buyer', 'agent', 'admin'],
      default: 'buyer',
    },
    avatar: { type: String, default: '' },
    avatarPublicId: { type: String },
    phone: { 
      type: String,
      trim: true,
      maxlength: [20, 'Phone number cannot exceed 20 characters'],
    },

    // Agent-specific fields
    agentProfile: {
      licenseNumber: { type: String, trim: true },
      agency: { type: String, trim: true },
      bio: { 
        type: String, 
        maxlength: [1000, 'Bio cannot exceed 1000 characters'],
        trim: true,
      },
      specializations: [{
        type: String,
        enum: ['residential', 'commercial', 'luxury', 'rental', 'new-development', 'land'],
      }],
      yearsOfExperience: { type: Number, min: 0 },
      website: { type: String, trim: true },
      socialLinks: {
        linkedin: { type: String, trim: true },
        twitter: { type: String, trim: true },
        facebook: { type: String, trim: true },
        instagram: { type: String, trim: true },
      },
      rating: { 
        type: Number, 
        default: 0, 
        min: 0, 
        max: 5,
        set: v => Math.round(v * 10) / 10, // Round to 1 decimal
      },
      reviewCount: { type: Number, default: 0, min: 0 },
      verified: { type: Boolean, default: false },
    },

    // Buyer-specific
    savedProperties: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Property' }],
    searchPreferences: {
      priceMin: { type: Number, min: 0 },
      priceMax: { type: Number, min: 0 },
      propertyTypes: [String],
      locations: [String],
      bedroomsMin: { type: Number, min: 0 },
    },

    // Account security
    isActive: { type: Boolean, default: true },
    emailVerified: { type: Boolean, default: false },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    passwordChangedAt: Date, // IMPORTANT: Added this field
    lastLogin: { type: Date },
    
    // Notification preferences
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

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ 'agentProfile.verified': 1 });
UserSchema.index({ isActive: 1 });

// Virtuals
UserSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Hash password before save
UserSchema.pre('save', async function (next) {
  // Only hash password if it's modified
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Update passwordChangedAt when password is modified
UserSchema.pre('save', function(next) {
  if (!this.isModified('password') || this.isNew) return next();
  
  // Set passwordChangedAt to current time minus 1 second
  // This ensures the token is created after the password change
  this.passwordChangedAt = new Date(Date.now() - 1000);
  next();
});

// Instance methods
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Check if password was changed after JWT was issued
UserSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

// Generate password reset token
UserSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  
  return resetToken;
};

// Hide sensitive fields in JSON output
UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  delete obj.emailVerificationToken;
  delete obj.emailVerificationExpires;
  return obj;
};

// Static methods
UserSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase().trim() });
};

module.exports = mongoose.model('User', UserSchema);