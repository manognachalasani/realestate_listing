const mongoose = require('mongoose');

const EnquirySchema = new mongoose.Schema(
  {
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: [true, 'Property reference is required'],
    },
    agent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Agent reference is required'],
    },
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Guest enquiry support (no account needed)
    guestName: { 
      type: String,
      required: function() { return !this.buyer; }, // Required if no buyer
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    guestEmail: {
      type: String,
      required: function() { return !this.buyer; }, // Required if no buyer
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address'],
    },
    guestPhone: { 
      type: String,
      trim: true,
    },

    message: {
      type: String,
      required: [true, 'Message is required'],
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
      trim: true,
    },

    enquiryType: {
      type: String,
      enum: ['general', 'viewing', 'offer', 'information'],
      default: 'general',
    },

    preferredViewingDate: { 
      type: Date,
      validate: {
        validator: function(value) {
          return !value || value > new Date();
        },
        message: 'Preferred viewing date must be in the future',
      },
    },
    preferredViewingTime: { 
      type: String,
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please use HH:MM format'],
    },

    status: {
      type: String,
      enum: ['new', 'read', 'replied', 'closed'],
      default: 'new',
    },

    agentNotes: { 
      type: String,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
    repliedAt: { type: Date },

    // Computed fields for easy display
    senderName: { type: String, trim: true },
    senderEmail: { type: String, lowercase: true, trim: true },
    senderPhone: { type: String, trim: true },
  },
  { timestamps: true }
);

// Pre-validate: ensure either buyer or guest info is provided
EnquirySchema.pre('validate', function(next) {
  if (!this.buyer && !this.guestEmail) {
    this.invalidate('guestEmail', 'Either buyer reference or guest email is required');
    this.invalidate('buyer', 'Either buyer reference or guest email is required');
  }
  next();
});

// Pre-save: resolve sender info from user or guest fields
EnquirySchema.pre('save', async function (next) {
  // Only compute if sender info is missing or buyer/guest info changed
  if (this.isModified('buyer') || this.isModified('guestName') || 
      this.isModified('guestEmail') || this.isModified('guestPhone') || 
      !this.senderName) {
    
    if (this.buyer) {
      try {
        // Lazy require to avoid circular dependency issues
        const User = mongoose.model('User');
        const user = await User.findById(this.buyer).select('firstName lastName email phone');
        if (user) {
          this.senderName = user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim();
          this.senderEmail = user.email;
          this.senderPhone = user.phone || '';
        }
      } catch (e) {
        // Use guest info as fallback if user lookup fails
        if (this.guestName) this.senderName = this.guestName;
        if (this.guestEmail) this.senderEmail = this.guestEmail;
        if (this.guestPhone) this.senderPhone = this.guestPhone;
        console.error('User lookup failed in Enquiry pre-save:', e.message);
      }
    } else {
      this.senderName = this.guestName || 'Anonymous';
      this.senderEmail = this.guestEmail;
      this.senderPhone = this.guestPhone || '';
    }
  }
  
  // Auto-set repliedAt when status changes to replied
  if (this.isModified('status') && this.status === 'replied' && !this.repliedAt) {
    this.repliedAt = new Date();
  }
  
  next();
});

// Compound indexes
EnquirySchema.index({ agent: 1, status: 1 });
EnquirySchema.index({ property: 1, createdAt: -1 });
EnquirySchema.index({ buyer: 1, createdAt: -1 });
EnquirySchema.index({ status: 1, createdAt: -1 });
EnquirySchema.index({ guestEmail: 1 }); // For lookup by guest email

module.exports = mongoose.model('Enquiry', EnquirySchema);