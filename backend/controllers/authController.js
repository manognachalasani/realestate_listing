const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const { generateToken } = require('../middleware/auth');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password, role, phone } = req.body;

  if (!firstName || !lastName || !email || !password) {
    res.status(400);
    throw new Error('All fields are required');
  }

  const exists = await User.findOne({ email });
  if (exists) {
    res.status(400);
    throw new Error('Email already registered');
  }

  const user = await User.create({
    firstName,
    lastName,
    email,
    password,
    role: role === 'agent' ? 'agent' : 'buyer',
    phone,
  });

  res.status(201).json({
    user: user.toJSON(),
    token: generateToken(user._id),
  });
});

// @desc    Login
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error('Email and password are required');
  }

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  if (!user.isActive) {
    res.status(401);
    throw new Error('Account is deactivated');
  }

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  res.json({
    user: user.toJSON(),
    token: generateToken(user._id),
  });
});

// @desc    Get current logged-in user
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('savedProperties', 'title price photos address');
  res.json(user);
});

// @desc    Update profile
// @route   PUT /api/auth/me
// @access  Private
const updateMe = asyncHandler(async (req, res) => {
  const allowedFields = ['firstName', 'lastName', 'phone', 'agentProfile', 'searchPreferences', 'notificationPreferences'];
  const updates = {};

  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
  res.json(user);
});

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(currentPassword))) {
    res.status(400);
    throw new Error('Current password is incorrect');
  }

  user.password = newPassword;
  await user.save();

  res.json({ message: 'Password changed successfully' });
});

// @desc    Toggle saved property
// @route   POST /api/auth/save-property/:propertyId
// @access  Private
const toggleSavedProperty = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const propId = req.params.propertyId;
  const idx = user.savedProperties.findIndex(id => id.toString() === propId);

  if (idx > -1) {
    user.savedProperties.splice(idx, 1);
    await user.save();
    return res.json({ saved: false, message: 'Property removed from saved list' });
  }

  user.savedProperties.push(propId);
  await user.save();
  res.json({ saved: true, message: 'Property saved' });
});

module.exports = { register, login, getMe, updateMe, changePassword, toggleSavedProperty };
