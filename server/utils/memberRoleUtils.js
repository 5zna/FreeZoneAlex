/** Normalize a MemberRole document (legacy single role or roles array) to [{ name, icon }] */
export function normalizeMemberRoles(doc) {
  if (!doc) return [];
  if (Array.isArray(doc.roles) && doc.roles.length) {
    return doc.roles.map(r => ({ name: r.roleName, icon: r.roleIcon || '' }));
  }
  if (doc.roleName) {
    return [{ name: doc.roleName, icon: doc.roleIcon || '' }];
  }
  return [];
}

export function rolesHaveOwner(roles) {
  return roles.some(r => r.name && r.name.charAt(0) === '@');
}

export function memberDocHasOwner(doc) {
  return rolesHaveOwner(normalizeMemberRoles(doc));
}

/** Persist legacy { roleName, roleIcon } fields into roles[] if needed */
export async function ensureRolesArray(doc) {
  if (!doc) return doc;
  if (Array.isArray(doc.roles) && doc.roles.length) return doc;
  if (doc.roleName) {
    doc.roles = [{ roleName: doc.roleName, roleIcon: doc.roleIcon || '' }];
    doc.roleName = undefined;
    doc.roleIcon = undefined;
    await doc.save();
  } else if (!doc.roles) {
    doc.roles = [];
  }
  return doc;
}

export async function findOwnerMemberRole(MemberRole) {
  const docs = await MemberRole.find().lean();
  for (const doc of docs) {
    if (memberDocHasOwner(doc)) return doc;
  }
  return null;
}
