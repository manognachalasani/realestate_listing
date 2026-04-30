const asyncHandler = require('express-async-handler');
const Enquiry = require('../models/Enquiry');
const Property = require('../models/Property');
const { sendEnquiryNotification, sendEnquiryConfirmation } = require('../utils/emailService');

// @desc    Submit a new enquiry
// @route   POST /api/enquiries
// @access  Public (guest or authenticated)
const createEnquiry = asyncHandler(async (req, res) => {
  const {
    propertyId,
    message,
    enquiryType,
    preferredViewingDate,
    preferredViewingTime,
    guestName,
    guestEmail,
    guestPhone,
  } = req.body;

  // Validate required sender info
  const isBuyer = req.user && req.user.role === 'buyer';
  const isGuest = !req.user;

  if (isGuest && (!guestName || !guestEmail)) {
    res.status(400);
    throw new Error('Name and email are required for guest enquiries');
  }

  const property = await Property.findById(propertyId).populate('agent', 'email firstName lastName notificationPreferences');
  if (!property) {
    res.status(404);
    throw new Error('Property not found');
  }

  const enquiryData = {
    property: propertyId,
    agent: property.agent._id,
    message,
    enquiryType: enquiryType || 'general',
    preferredViewingDate,
    preferredViewingTime,
  };

  if (req.user) {
    enquiryData.buyer = req.user._id;
  } else {
    enquiryData.guestName = guestName;
    enquiryData.guestEmail = guestEmail;
    enquiryData.guestPhone = guestPhone;
  }

  const enquiry = await Enquiry.create(enquiryData);
  await enquiry.populate([
    { path: 'property', select: 'title address photos price' },
    { path: 'agent', select: 'firstName lastName email' },
  ]);

  // Send email notifications (non-blocking)
  if (property.agent.notificationPreferences?.emailEnquiries !== false) {
    sendEnquiryNotification(enquiry, property).catch(err =>
      console.error('Enquiry notification email failed:', err.message)
    );
  }

  // Confirmation to sender
  const senderEmail = req.user?.email || guestEmail;
  const senderName = req.user ? `${req.user.firstName}` : guestName;
  if (senderEmail) {
    sendEnquiryConfirmation(senderEmail, senderName, property).catch(err =>
      console.error('Confirmation email failed:', err.message)
    );
  }

  res.status(201).json(enquiry);
});

// @desc    Get enquiries for logged-in agent
// @route   GET /api/enquiries/agent
// @access  Private (agents)
const getAgentEnquiries = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const query = { agent: req.user._id };
  if (status) query.status = status;

  const skip = (Number(page) - 1) * Number(limit);
  const [enquiries, total] = await Promise.all([
    Enquiry.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('property', 'title address photos price')
      .populate('buyer', 'firstName lastName email phone avatar'),
    Enquiry.countDocuments(query),
  ]);

  res.json({
    enquiries,
    pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
  });
});

// @desc    Get enquiries submitted by a buyer
// @route   GET /api/enquiries/my
// @access  Private (buyers)
const getMyEnquiries = asyncHandler(async (req, res) => {
  const enquiries = await Enquiry.find({ buyer: req.user._id })
    .sort({ createdAt: -1 })
    .populate('property', 'title address photos price status')
    .populate('agent', 'firstName lastName email phone avatar');
  res.json(enquiries);
});

// @desc    Update enquiry status or add agent notes
// @route   PATCH /api/enquiries/:id/status
// @access  Private (agents)
const updateEnquiryStatus = asyncHandler(async (req, res) => {
  const { status, agentNotes } = req.body;

  const enquiry = await Enquiry.findOne({ _id: req.params.id, agent: req.user._id });
  if (!enquiry) {
    res.status(404);
    throw new Error('Enquiry not found');
  }

  if (status) enquiry.status = status;
  if (agentNotes !== undefined) enquiry.agentNotes = agentNotes;
  if (status === 'replied') enquiry.repliedAt = new Date();

  await enquiry.save();
  res.json(enquiry);
});

// @desc    Get enquiry stats for agent dashboard
// @route   GET /api/enquiries/stats
// @access  Private (agents)
const getEnquiryStats = asyncHandler(async (req, res) => {
  const agentId = req.user._id;

  const stats = await Enquiry.aggregate([
    { $match: { agent: agentId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  const result = { new: 0, read: 0, replied: 0, closed: 0, total: 0 };
  stats.forEach(s => {
    result[s._id] = s.count;
    result.total += s.count;
  });

  // Recent 30-day trend
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const trend = await Enquiry.aggregate([
    { $match: { agent: agentId, createdAt: { $gte: thirtyDaysAgo } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.json({ ...result, trend });
});

module.exports = { createEnquiry, getAgentEnquiries, getMyEnquiries, updateEnquiryStatus, getEnquiryStats };
