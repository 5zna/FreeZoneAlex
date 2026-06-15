import mongoose from 'mongoose';

var entrySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  description: { type: String, default: '' }
}, { _id: false });

var contributorCategorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  icon: { type: String, default: '' },
  entries: [entrySchema],
  order: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model('ContributorCategory', contributorCategorySchema);
