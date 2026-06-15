import Report from '../models/Report.js';
import Reply from '../models/Reply.js';

var SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
var INTERVAL_MS = 60 * 60 * 1000;

export function startReportCleanup() {
  runCleanup();
  setInterval(runCleanup, INTERVAL_MS);
}

async function runCleanup() {
  try {
    var cutoff = new Date(Date.now() - SEVEN_DAYS_MS);
    var oldReports = await Report.find({ createdAt: { $lt: cutoff } }, { _id: 1 }).lean();
    if (oldReports.length === 0) return;
    var ids = oldReports.map(function (r) { return r._id; });
    await Reply.deleteMany({ reportId: { $in: ids } });
    await Report.deleteMany({ _id: { $in: ids } });
    console.log('Cleaned up ' + ids.length + ' old reports and their replies');
  } catch (err) {
    console.error('Report cleanup error:', err);
  }
}
