import mongoose from 'mongoose';
import User from './models/User.js';
import MemberRole from './models/MemberRole.js';

const MONGO_URI = 'mongodb+srv://FreeZoneEMC:7uEq2cfhg9xnwuoO@freezone.ltkxfry.mongodb.net/freezone-jobs?retryWrites=true&w=majority';
const TARGET_ID = '6a284ef0e1713c793e69825e';

async function run() {
  await mongoose.connect(MONGO_URI);
  const user = await User.findById(TARGET_ID).lean();
  const mr = await MemberRole.findOne({ userId: TARGET_ID }).lean();
  console.log('--- USER ---');
  console.log(JSON.stringify(user, null, 2));
  console.log('--- MEMBER ROLE ---');
  console.log(JSON.stringify(mr, null, 2));
  await mongoose.disconnect();
}

run().catch(console.error);
