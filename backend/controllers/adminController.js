const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const User = require('../models/User');
const Property = require('../models/Property');
const Enquiry = require('../models/Enquiry');
const AuditLog = require('../models/AuditLog');
const { cloudinary } = require('../config/cloudinary');
const { sendAgentVerificationEmail } = require('../utils/emailService');

// ── Helper ────────────────────────────────────────────────────────────────────

const logAction = (adminId, action, targetType, targetId, details, ip) =>
  AuditLog.create({ adminId, action, targetType, targetId, details, ip }).catch(err =>
    console.error('AuditLog write failed:', err.message)
  );

const getPagination = (query) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(Number(query.limit) || 20, 100);
  return { page, limit, skip: (page - 1) * limit };
};

const paginated = (key, docs, page, limit, total) => ({
  [key]: docs,
  pagination: { page, limit, total, pages: Math.ceil(total / limit) },
});

// ── Dashboard / Analytics ─────────────────────────────────────────────────────

// @desc    Platform-wide dashboard stats
// @route   GET /api/admin/dashboard
// @access  Admin
const getDashboard = asyncHandler(async (req, res) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [userStats, propertyStats, enquiryStats, recentSignups] = await Promise.all([
    User.aggregate([
      { $facet: {
        byRole: [{ $group: { _id: '$role', count: { $sum: 1 } } }],
        active: [{ $match: { isActive: true } }, { $count: 'count' }],
        inactive: [{ $match: { isActive: false } }, { $count: 'count' }],
        total: [{ $count: 'count' }],
      }},
    ]),
    Property.aggregate([
      { $facet: {
        byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
        total: [{ $count: 'count' }],
        avgPrice: [{ $group: { _id: null, avg: { $avg: '$price' } } }],
      }},
    ]),
    Enquiry.aggregate([
      { $facet: {
        byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
        total: [{ $count: 'count' }],
      }},
    ]),
    User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
  ]);

  const toMap = (arr) => arr.reduce((acc, { _id, count }) => { acc[_id] = count; return acc; }, {});

  const users = userStats[0];
  const properties = propertyStats[0];
  const enquiries = enquiryStats[0];

  res.json({
    users: {
      total: users.total[0]?.count || 0,
      active: users.active[0]?.count || 0,
      inactive: users.inactive[0]?.count || 0,
      byRole: toMap(users.byRole),
      newLast30d: recentSignups,
    },
    properties: {
      total: properties.total[0]?.count || 0,
      byStatus: toMap(properties.byStatus),
      avgPrice: Math.round(properties.avgPrice[0]?.avg || 0),
    },
    enquiries: {
      total: enquiries.total[0]?.count || 0,
      byStatus: toMap(enquiries.byStatus),
    },
  });
});

// @desc    Property analytics (over time, top cities, avg price by type)
// @route   GET /api/admin/analytics/properties
// @access  Admin
const getPropertyAnalytics = asyncHandler(async (req, res) => {
  const { period = 'month' } = req.query;
  const dateFormat = period === 'week' ? '%Y-%U' : '%Y-%m';

  const [overTime, topCities, avgByType] = await Promise.all([
    Property.aggregate([
      { $group: {
        _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
        count: { $sum: 1 },
      }},
      { $sort: { _id: 1 } },
      { $limit: 24 },
    ]),
    Property.aggregate([
      { $group: { _id: '$address.city', count: { $sum: 1 }, avgPrice: { $avg: '$price' } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    Property.aggregate([
      { $group: { _id: '$propertyType', avgPrice: { $avg: '$price' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
  ]);

  res.json({ overTime, topCities, avgByType });
});

// @desc    User analytics (registrations over time, role breakdown)
// @route   GET /api/admin/analytics/users
// @access  Admin
const getUserAnalytics = asyncHandler(async (req, res) => {
  const { period = 'month' } = req.query;
  const dateFormat = period === 'week' ? '%Y-%U' : '%Y-%m';

  const [overTime, byRole] = await Promise.all([
    User.aggregate([
      { $group: {
        _id: {
          period: { $dateToString: { format: dateFormat, date: '$createdAt' } },
          role: '$role',
        },
        count: { $sum: 1 },
      }},
      { $sort: { '_id.period': 1 } },
      { $limit: 72 },
    ]),
    User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]),
  ]);

  res.json({ overTime, byRole });
});

// ── User Management ───────────────────────────────────────────────────────────

// @desc    List all users with filters
// @route   GET /api/admin/users
// @access  Admin
const listUsers = asyncHandler(async (req, res) => {
  const { role, isActive, search, sort = 'createdAt', order = 'desc' } = req.query;
  const { page, limit, skip } = getPagination(req.query);
  const query = {};
  if (role) query.role = role;
  if (isActive !== undefined) query.isActive = isActive === 'true';
  if (search) {
    const re = { $regex: search, $options: 'i' };
    query.$or = [{ firstName: re }, { lastName: re }, { email: re }];
  }
  const [users, total] = await Promise.all([
    User.find(query).sort({ [sort]: order === 'asc' ? 1 : -1 }).skip(skip).limit(limit).select('-password'),
    User.countDocuments(query),
  ]);
  res.json(paginated('users', users, page, limit, total));
});

// @desc    Get single user with listing count
// @route   GET /api/admin/users/:id
// @access  Admin
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  if (!user) { res.status(404); throw new Error('User not found'); }

  const [listingCount, enquiryCount] = await Promise.all([
    Property.countDocuments({ agent: user._id }),
    Enquiry.countDocuments({ $or: [{ agent: user._id }, { buyer: user._id }] }),
  ]);

  res.json({ user, listingCount, enquiryCount });
});

// @desc    Toggle user active status
// @route   PATCH /api/admin/users/:id/status
// @access  Admin
const toggleUserStatus = asyncHandler(async (req, res) => {
  if (req.params.id === req.user._id.toString()) {
    res.status(400);
    throw new Error('Admins cannot deactivate their own account');
  }

  const user = await User.findById(req.params.id);
  if (!user) { res.status(404); throw new Error('User not found'); }

  user.isActive = !user.isActive;
  await user.save({ validateBeforeSave: false });

  const action = user.isActive ? 'activate_user' : 'deactivate_user';
  logAction(req.user._id, action, 'User', user._id, { isActive: user.isActive }, req.ip);

  res.json({ isActive: user.isActive, message: `User ${user.isActive ? 'activated' : 'deactivated'}` });
});

// @desc    Change user role
// @route   PATCH /api/admin/users/:id/role
// @access  Admin
const changeUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!['buyer', 'agent', 'admin'].includes(role)) {
    res.status(400);
    throw new Error('Invalid role. Must be buyer, agent, or admin');
  }

  if (req.params.id === req.user._id.toString()) {
    res.status(400);
    throw new Error('Admins cannot change their own role');
  }

  const user = await User.findById(req.params.id);
  if (!user) { res.status(404); throw new Error('User not found'); }

  const prevRole = user.role;
  user.role = role;
  await user.save({ validateBeforeSave: false });

  logAction(req.user._id, 'change_role', 'User', user._id, { from: prevRole, to: role }, req.ip);

  res.json({ role: user.role, message: `Role changed from ${prevRole} to ${role}` });
});

// @desc    Delete user and cascade
// @route   DELETE /api/admin/users/:id
// @access  Admin
const deleteUser = asyncHandler(async (req, res) => {
  if (req.params.id === req.user._id.toString()) {
    res.status(400);
    throw new Error('Admins cannot delete their own account');
  }

  const user = await User.findById(req.params.id);
  if (!user) { res.status(404); throw new Error('User not found'); }

  // Withdraw all their property listings and delete their enquiries
  await Promise.all([
    Property.updateMany({ agent: user._id }, { status: 'withdrawn' }),
    Enquiry.deleteMany({ $or: [{ agent: user._id }, { buyer: user._id }] }),
  ]);

  logAction(req.user._id, 'delete_user', 'User', user._id, { email: user.email, role: user.role }, req.ip);
  await user.deleteOne();

  res.json({ message: 'User deleted. Their listings have been withdrawn.' });
});

// ── Property Moderation ───────────────────────────────────────────────────────

// @desc    List all properties (all statuses)
// @route   GET /api/admin/properties
// @access  Admin
const listAllProperties = asyncHandler(async (req, res) => {
  const { status, agentId, city, type, listingType } = req.query;
  const { page, limit, skip } = getPagination(req.query);

  const query = {};
  if (status) query.status = status;
  if (agentId) query.agent = agentId;
  if (city) query['address.city'] = { $regex: city, $options: 'i' };
  if (type) query.propertyType = type;
  if (listingType) query.listingType = listingType;

  const [properties, total] = await Promise.all([
    Property.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit)
      .populate('agent', 'firstName lastName email agentProfile.verified'),
    Property.countDocuments(query),
  ]);
  res.json(paginated('properties', properties, page, limit, total));
});

// @desc    Get single property (admin view — all fields)
// @route   GET /api/admin/properties/:id
// @access  Admin
const getPropertyById = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id)
    .populate('agent', 'firstName lastName email phone agentProfile');
  if (!property) { res.status(404); throw new Error('Property not found'); }

  const enquiryCount = await Enquiry.countDocuments({ property: property._id });
  res.json({ property, enquiryCount });
});

// @desc    Override property status
// @route   PATCH /api/admin/properties/:id/status
// @access  Admin
const overridePropertyStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['active', 'pending', 'sold', 'rented', 'withdrawn'];
  if (!validStatuses.includes(status)) {
    res.status(400);
    throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  const property = await Property.findById(req.params.id);
  if (!property) { res.status(404); throw new Error('Property not found'); }

  const prevStatus = property.status;
  property.status = status;
  if (['sold', 'rented'].includes(status)) property.soldAt = new Date();
  await property.save({ validateBeforeSave: false });

  logAction(req.user._id, 'override_property_status', 'Property', property._id,
    { from: prevStatus, to: status }, req.ip);

  res.json({ status: property.status, message: `Property status changed to ${status}` });
});

// @desc    Delete property (hard delete + Cloudinary cleanup + enquiry removal)
// @route   DELETE /api/admin/properties/:id
// @access  Admin
const deletePropertyAdmin = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id);
  if (!property) { res.status(404); throw new Error('Property not found'); }

  const cloudinaryDeletes = property.photos
    .filter(p => p.publicId)
    .map(p => cloudinary.uploader.destroy(p.publicId));
  if (property.floorPlanPublicId) {
    cloudinaryDeletes.push(cloudinary.uploader.destroy(property.floorPlanPublicId));
  }

  await Promise.allSettled(cloudinaryDeletes);
  await Promise.all([
    property.deleteOne(),
    Enquiry.deleteMany({ property: property._id }),
  ]);

  logAction(req.user._id, 'delete_property', 'Property', property._id,
    { title: property.title, agentId: property.agent }, req.ip);

  res.json({ message: 'Property and all associated enquiries deleted' });
});

// ── Agent Verification ────────────────────────────────────────────────────────

// @desc    List agents pending verification
// @route   GET /api/admin/agents/pending
// @access  Admin
const listPendingAgents = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);

  const query = { role: 'agent', 'agentProfile.verified': false };
  const [agents, total] = await Promise.all([
    User.find(query).sort({ createdAt: 1 }).skip(skip).limit(limit).select('-password'),
    User.countDocuments(query),
  ]);
  res.json(paginated('agents', agents, page, limit, total));
});

// @desc    Verify an agent
// @route   PATCH /api/admin/agents/:id/verify
// @access  Admin
const verifyAgent = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, role: 'agent' });
  if (!user) { res.status(404); throw new Error('Agent not found'); }

  user.agentProfile.verified = true;
  await user.save({ validateBeforeSave: false });

  sendAgentVerificationEmail(user, true).catch(err =>
    console.error('Agent verification email failed:', err.message)
  );
  logAction(req.user._id, 'verify_agent', 'User', user._id, {}, req.ip);

  res.json({ verified: true, message: `Agent ${user.email} has been verified` });
});

// @desc    Revoke agent verification
// @route   PATCH /api/admin/agents/:id/unverify
// @access  Admin
const unverifyAgent = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, role: 'agent' });
  if (!user) { res.status(404); throw new Error('Agent not found'); }

  user.agentProfile.verified = false;
  await user.save({ validateBeforeSave: false });

  sendAgentVerificationEmail(user, false).catch(err =>
    console.error('Agent unverification email failed:', err.message)
  );
  logAction(req.user._id, 'unverify_agent', 'User', user._id, {}, req.ip);

  res.json({ verified: false, message: `Agent ${user.email} verification revoked` });
});

// ── Enquiry Oversight ─────────────────────────────────────────────────────────

// @desc    List all enquiries platform-wide
// @route   GET /api/admin/enquiries
// @access  Admin
const listAllEnquiries = asyncHandler(async (req, res) => {
  const { status, agentId, propertyId } = req.query;
  const { page, limit, skip } = getPagination(req.query);

  const query = {};
  if (status) query.status = status;
  if (agentId) query.agent = agentId;
  if (propertyId) query.property = propertyId;

  const [enquiries, total] = await Promise.all([
    Enquiry.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit)
      .populate('property', 'title address price')
      .populate('agent', 'firstName lastName email')
      .populate('buyer', 'firstName lastName email'),
    Enquiry.countDocuments(query),
  ]);
  res.json(paginated('enquiries', enquiries, page, limit, total));
});

// @desc    Delete an enquiry
// @route   DELETE /api/admin/enquiries/:id
// @access  Admin
const deleteEnquiryAdmin = asyncHandler(async (req, res) => {
  const enquiry = await Enquiry.findById(req.params.id);
  if (!enquiry) { res.status(404); throw new Error('Enquiry not found'); }

  logAction(req.user._id, 'delete_enquiry', 'Enquiry', enquiry._id,
    { property: enquiry.property, senderEmail: enquiry.senderEmail }, req.ip);
  await enquiry.deleteOne();

  res.json({ message: 'Enquiry deleted' });
});

// ── Audit Log ─────────────────────────────────────────────────────────────────

// @desc    Get audit log
// @route   GET /api/admin/audit-log
// @access  Admin
const getAuditLog = asyncHandler(async (req, res) => {
  const { adminId, action, targetType, from, to } = req.query;
  const { page, limit, skip } = getPagination(req.query);

  const query = {};
  if (adminId) query.adminId = adminId;
  if (action) query.action = action;
  if (targetType) query.targetType = targetType;
  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = new Date(from);
    if (to) query.createdAt.$lte = new Date(to);
  }

  const [logs, total] = await Promise.all([
    AuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit)
      .populate('adminId', 'firstName lastName email'),
    AuditLog.countDocuments(query),
  ]);
  res.json(paginated('logs', logs, page, limit, total));
});

module.exports = {
  getDashboard,
  getPropertyAnalytics,
  getUserAnalytics,
  listUsers,
  getUserById,
  toggleUserStatus,
  changeUserRole,
  deleteUser,
  listAllProperties,
  getPropertyById,
  overridePropertyStatus,
  deletePropertyAdmin,
  listPendingAgents,
  verifyAgent,
  unverifyAgent,
  listAllEnquiries,
  deleteEnquiryAdmin,
  getAuditLog,
};
