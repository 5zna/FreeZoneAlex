import mongoose from 'mongoose';

const contributorSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  role: { type: String, default: '' },
  link: { type: String, default: '' },
  avatar: { type: String, default: '' }
}, { _id: false });

const contributorCategorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  order: { type: Number, default: 0 },
  contributors: { type: [contributorSchema], default: [] }
}, { timestamps: true });

export default mongoose.model('ContributorCategory', contributorCategorySchema);
