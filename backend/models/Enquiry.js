const mongoose = require('mongoose');

const EnquirySchema = new mongoose.Schema(
  {
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
    },
    agent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Guest enquiry support (no account needed)
    guestName: { type: String },
    guestEmail: {
      type: String,
      match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address'],
    },
    guestPhone: { type: String },

    message: {
      type: String,
      required: [true, 'Message is required'],
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
    },

    enquiryType: {
      type: String,
      enum: ['general', 'viewing', 'offer', 'information'],
      default: 'general',
    },

    preferredViewingDate: { type: Date },
    preferredViewingTime: { type: String },

    status: {
      type: String,
      enum: ['new', 'read', 'replied', 'closed'],
      default: 'new',
    },

    agentNotes: { type: String },
    repliedAt: { type: Date },

    // Computed
    senderName: { type: String },
    senderEmail: { type: String },
    senderPhone: { type: String },
  },
  { timestamps: true }
);

// Pre-save: resolve sender info from user or guest fields
EnquirySchema.pre('save', async function (next) {
  if (this.buyer) {
    try {
      const User = mongoose.model('User');
      const user = await User.findById(this.buyer).select('firstName lastName email phone');
      if (user) {
        this.senderName = user.fullName || `${user.firstName} ${user.lastName}`;
        this.senderEmail = user.email;
        this.senderPhone = user.phone;
      }
    } catch (e) {
      // Silently continue
    }
  } else {
    this.senderName = this.guestName;
    this.senderEmail = this.guestEmail;
    this.senderPhone = this.guestPhone;
  }
  next();
});

EnquirySchema.index({ agent: 1, status: 1 });
EnquirySchema.index({ property: 1 });
EnquirySchema.index({ buyer: 1 });
EnquirySchema.index({ createdAt: -1 });

module.exports = mongoose.model('Enquiry', EnquirySchema);
