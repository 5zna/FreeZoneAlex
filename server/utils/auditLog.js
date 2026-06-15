import AuditLog from '../models/AuditLog.js';

export function actorSnapshot(user) {
  if (!user) return { actorId: null, actorName: 'System', actorRole: 'system' };
  return {
    actorId: user._id || user.id || null,
    actorName: user.displayName || user.name || user.username || 'Unknown',
    actorRole: user.role || 'user'
  };
}

export async function createAuditLog(entry = {}) {
  try {
    return await AuditLog.create({
      category: entry.category || 'activity',
      type: entry.type || 'general',
      actionType: entry.actionType || '',
      actorId: entry.actorId || null,
      actorName: entry.actorName || 'System',
      actorRole: entry.actorRole || '',
      targetType: entry.targetType || '',
      targetId: entry.targetId || '',
      targetName: entry.targetName || '',
      message: entry.message || '',
      details: entry.details || '',
      meta: entry.meta || {}
    });
  } catch (err) {
    console.error('audit log error:', err.message);
    return null;
  }
}

export function requestMessage(req, message, details = '') {
  const actor = actorSnapshot(req.user);
  return {
    category: 'activity',
    type: 'general',
    actorId: actor.actorId,
    actorName: actor.actorName,
    actorRole: actor.actorRole,
    message,
    details
  };
}
