const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Property = require('../models/Property');
const { protect } = require('../middleware/auth');

// Get all agents (public)
router.get('/', asyncHandler(async (req, res) => {
  const { page = 1, limit = 12, city, specialization } = req.query;
  const query = { role: 'agent', isActive: true };
  if (specialization) query['agentProfile.specializations'] = specialization;

  const agents = await User.find(query)
    .select('-password -savedProperties -searchPreferences')
    .sort({ 'agentProfile.rating': -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await User.countDocuments(query);
  res.json({ agents, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) } });
}));

// Get single agent profile with their listings
router.get('/:id', asyncHandler(async (req, res) => {
  const agent = await User.findOne({ _id: req.params.id, role: 'agent' })
    .select('-password -savedProperties -searchPreferences -notificationPreferences');

  if (!agent) {
    res.status(404);
    throw new Error('Agent not found');
  }

  const listings = await Property.find({ agent: req.params.id, status: 'active' })
    .sort({ createdAt: -1 })
    .limit(6);

  res.json({ agent, listings });
}));

module.exports = router;
