import mongoose from 'mongoose';
import User from './models/User.js';

const MONGO_URI = 'mongodb+srv://FreeZoneEMC:7uEq2cfhg9xnwuoO@freezone.ltkxfry.mongodb.net/freezone-jobs?retryWrites=true&w=majority';

async function run() {
  await mongoose.connect(MONGO_URI);
  const users = await User.find({}).lean();
  console.log(JSON.stringify(users.map(u => ({
    _id: u._id,
    name: u.name,
    username: u.username,
    role: u.role
  })), null, 2));
  await mongoose.disconnect();
}

run().catch(console.error);
