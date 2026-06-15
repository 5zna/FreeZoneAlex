import AuditLog from '../models/AuditLog.js';

export async function createAuditLog(data) {
  try { await AuditLog.create(data); } catch {}
}

export function actorSnapshot(user) {
  return { actorName: user?.displayName || user?.name || user?.username || 'Unknown' };
}
