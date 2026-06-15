export function normalizeMemberRoles(doc) {
  if (!doc) return [];
  if (Array.isArray(doc.roles)) return doc.roles.filter(r => r && r.roleName).map(r => ({ name: r.roleName, icon: r.roleIcon || '' }));
  return [];
}

export function memberDocHasOwner(doc) {
  if (!doc) return false;
  const roles = normalizeMemberRoles(doc);
  return roles.some(r => r.name && r.name.charAt(0) === '@');
}

export async function ensureRolesArray(doc) {
  if (!doc.roles) doc.roles = [];
  if (!Array.isArray(doc.roles)) doc.roles = [];
  return doc;
}

export async function findOwnerMemberRole(MemberRole) {
  const docs = await MemberRole.find().lean();
  for (const doc of docs) {
    if (memberDocHasOwner(doc)) return doc;
  }
  return null;
}
