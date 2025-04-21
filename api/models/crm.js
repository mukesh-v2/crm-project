const mongoose = require('mongoose');

const crmSchema = new mongoose.Schema({
  labCode: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  expiryDate: { type: String, required: true },
  make: String,
  quantity: String,
  purity: String,
  productCode: String,
  casNo: String,
  section: { type: String, required: true },
  location: String,
  boxNo: String,
  remarks: String,
  status: { type: String, enum: ['active', 'consumed'], default: 'active' },
  orderPlaced: { type: Boolean, default: false },
  notRequired: { type: Boolean, default: false }
});

module.exports = mongoose.model('CRM', crmSchema);