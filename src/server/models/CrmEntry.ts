import mongoose from 'mongoose';

const CrmEntrySchema = new mongoose.Schema({
  labCode: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  expiryDate: { type: String, required: true },
  make: { type: String, required: true },
  quantity: { type: String, required: true },
  purity: { type: String, required: true },
  productCode: { type: String, required: true },
  casNo: { type: String, required: true },
  section: { type: String, required: true },
  location: { type: String, required: true },
  boxNo: { type: String, required: true },
  remarks: { type: String, required: true },
  status: { type: String, default: 'active' },
  orderPlaced: { type: Boolean, default: false },
  notRequired: { type: Boolean, default: false }
});

export default mongoose.model('CrmEntry', CrmEntrySchema);