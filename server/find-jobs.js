import mongoose from 'mongoose';
import Job from './models/Job.js';

const MONGO_URI = 'mongodb+srv://FreeZoneEMC:7uEq2cfhg9xnwuoO@freezone.ltkxfry.mongodb.net/freezone-jobs?retryWrites=true&w=majority';

async function run() {
  await mongoose.connect(MONGO_URI);
  const jobs = await Job.find({
    $or: [
      { orgName: /Omar/i },
      { postedBy: '6a2be345ee29ef65f88d6b3b' },
      { postedBy: '6a284ef0e1713c793e69825e' }
    ]
  }).lean();
  console.log(JSON.stringify(jobs.map(j => ({
    _id: j._id,
    title_en: j.title_en,
    orgName: j.orgName,
    creatorType: j.creatorType,
    postedBy: j.postedBy
  })), null, 2));
  await mongoose.disconnect();
}

run().catch(console.error);
