const mongoose = require('mongoose');
const { Schema, Types } = mongoose;

const User = mongoose.model('User', new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, default: '' },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  avatar: { type: String, default: '' },
  bio: { type: String, default: '' },
  walletBalance: { type: Number, default: 5000000 },
  kycStatus: { type: String, enum: ['none', 'pending', 'verified', 'rejected'], default: 'none' },
  kycImages: [String],
  accountStatus: { type: String, enum: ['active', 'suspended'], default: 'active' },
  kycConsentAt: Date,
  isDemo: { type: Boolean, default: false },
  demoKey: { type: String, unique: true, sparse: true },
  kycSubmission: { documentType: { type: String, enum: ['cccd', 'passport'] }, documentNumber: String, fullName: String, submittedAt: Date },
  kycHistory: [{ status: String, note: String, reviewedAt: Date, reviewedBy: { type: Types.ObjectId, ref: 'User' } }],
  kycReview: { note: String, reviewedAt: Date, reviewedBy: { type: Types.ObjectId, ref: 'User' } },
  ratingAvg: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
  completedCount: { type: Number, default: 0 },
  trustScore: { type: Number, default: 50 },
  avgResponseMinutes: { type: Number, default: 30 },
}, { timestamps: true }));

const Category = mongoose.model('Category', new Schema({
  name: { type: String, required: true, unique: true },
  slug: { type: String, required: true, unique: true },
  icon: { type: String, default: '📦' },
}));

const assetSchema = new Schema({
  isDemo: { type: Boolean, default: false },
  demoKey: { type: String, unique: true, sparse: true },
  owner: { type: Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true },
  slug: { type: String, index: true },
  category: { type: String, required: true, index: true },
  description: { type: String, default: '' },
  images: [String],
  video: { type: String, default: '' },
  serialImage: { type: String, default: '' },
  condition: { type: Number, default: 95 },
  accessories: [String],
  pricePerHour: { type: Number, default: 0 },
  pricePerDay: { type: Number, required: true },
  deposit: { type: Number, default: 0 },
  bufferHours: { type: Number, default: 2 },
  purchasePrice: { type: Number, default: 0 },
  delivery: { type: String, enum: ['pickup', 'delivery', 'both'], default: 'pickup' },
  location: { lat: Number, lng: Number, address: String },
  status: { type: String, enum: ['pending', 'active', 'rejected', 'hidden'], default: 'pending' },
  bookingRevision: { type: Number, default: 0 },
  blockedRanges: [{ from: Date, to: Date, reason: { type: String, default: 'Maintenance' } }],
  ratingAvg: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
}, { timestamps: true });
assetSchema.index({ title: 'text', description: 'text' });
assetSchema.index({ status: 1, category: 1, pricePerDay: 1 });
const Asset = mongoose.model('Asset', assetSchema);

const Booking = mongoose.model('Booking', new Schema({
  isDemo: { type: Boolean, default: false },
  demoKey: { type: String, unique: true, sparse: true },
  asset: { type: Types.ObjectId, ref: 'Asset', required: true },
  renter: { type: Types.ObjectId, ref: 'User', required: true, index: true },
  owner: { type: Types.ObjectId, ref: 'User', required: true, index: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  days: Number,
  rentalFee: Number,
  deposit: Number,
  discount: { type: Number, default: 0 },
  total: Number,
  termsAcceptance: { user: { type: Types.ObjectId, ref: 'User' }, acceptedAt: Date, version: String, snapshot: [String] },
  pickupNote: String,
  returnNote: String,
  handoverAddress: String,
  paymentMethod: { type: String, default: 'wallet' },
  paymentStatus: { type: String, enum: ['authorized', 'captured', 'refunded', 'partial'], default: 'authorized' },
  status: { type: String, enum: ['pending', 'paid', 'picked_up', 'returned', 'completed', 'rejected', 'cancelled', 'disputed'], default: 'pending', index: true },
  rejectReason: String,
  pickupToken: String,
  returnToken: String,
  checkinPhotos: [String],
  checkoutPhotos: [String],
  checkinAt: Date,
  checkoutAt: Date,
  reviewedByRenter: { type: Boolean, default: false },
  reviewedByOwner: { type: Boolean, default: false },
  dispute: {
    responses: [{ from: { type: Types.ObjectId, ref: 'User' }, note: String, photos: [String], at: Date }],
    openedBy: { type: Types.ObjectId, ref: 'User' },
    reason: String,
    status: { type: String, enum: ['open', 'resolved'] },
    refundToRenterPercent: Number,
    compensationToOwner: Number,
    refundToRenter: Number,
    rentalReleasedToOwner: Number,
    depositAtResolution: Number,
    resolvedBy: { type: Types.ObjectId, ref: 'User' },
    adminNote: String,
    resolvedAt: Date,
  },
}, { timestamps: true }));

const Review = mongoose.model('Review', new Schema({
  booking: { type: Types.ObjectId, ref: 'Booking' },
  asset: { type: Types.ObjectId, ref: 'Asset' },
  from: { type: Types.ObjectId, ref: 'User' },
  to: { type: Types.ObjectId, ref: 'User' },
  rating: { type: Number, min: 1, max: 5 },
  comment: String,
}, { timestamps: true }));

const Message = mongoose.model('Message', new Schema({
  from: { type: Types.ObjectId, ref: 'User', index: true },
  to: { type: Types.ObjectId, ref: 'User', index: true },
  booking: { type: Types.ObjectId, ref: 'Booking' },
  asset: { type: Types.ObjectId, ref: 'Asset' },
  text: String,
  image: String,
  read: { type: Boolean, default: false },
}, { timestamps: true }));

const RentalRequest = mongoose.model('RentalRequest', new Schema({
  renter: { type: Types.ObjectId, ref: 'User' },
  title: String,
  category: String,
  budget: Number,
  dateFrom: Date,
  dateTo: Date,
  radius: { type: Number, default: 5 },
  lat: Number, lng: Number,
  details: String,
  matches: [{ asset: { type: Types.ObjectId, ref: 'Asset' }, score: Number, distance: Number }],
}, { timestamps: true }));

const TrustEvent = mongoose.model('TrustEvent', new Schema({
  user: { type: Types.ObjectId, ref: 'User', required: true, index: true },
  booking: { type: Types.ObjectId, ref: 'Booking', required: true },
  kind: { type: String, enum: ['late_return', 'damage', 'nonpayment', 'other'], required: true },
  summary: { type: String, required: true },
  evidence: { type: String, required: true },
  penalty: { type: Number, min: 1, max: 30, required: true },
  status: { type: String, enum: ['confirmed', 'revoked'], default: 'confirmed' },
  createdBy: { type: Types.ObjectId, ref: 'User' },
  appeal: String, appealAt: Date, resolution: String, resolvedAt: Date
}, { timestamps: true }));
const AuditLog = mongoose.model('AuditLog', new Schema({
  actor: { type: Types.ObjectId, ref: 'User' }, action: String, target: String, note: String
}, { timestamps: true }));
module.exports = { TrustEvent, AuditLog, User, Category, Asset, Booking, Review, Message, RentalRequest };
