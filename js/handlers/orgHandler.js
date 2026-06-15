import { API_BASE_URL } from '../core/constants.js';

let cachedOrgs = [];
let listeners = [];

export function onOrgsChange(fn) {
  listeners.push(fn);
}

function notify() {
  listeners.forEach(fn => fn(cachedOrgs));
}

export function getCachedOrgs() {
  if (cachedOrgs.length === 0) {
    try {
      const stored = sessionStorage.getItem('freezoneServerOrgs');
      if (stored) cachedOrgs = JSON.parse(stored);
    } catch {}
  }
  return cachedOrgs;
}

export async function fetchOrgs() {
  try {
    const res = await fetch(`${API_BASE_URL}/organizations`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch');
    const data = await res.json();
    cachedOrgs = data.organizations || [];
    try { sessionStorage.setItem('freezoneServerOrgs', JSON.stringify(cachedOrgs)); } catch {}
    notify();
    window.dispatchEvent(new CustomEvent('identityChanged'));
    return cachedOrgs;
  } catch {
    cachedOrgs = [];
    try { sessionStorage.removeItem('freezoneServerOrgs'); } catch {}
    notify();
    return [];
  }
}

export async function createOrg({ name, owner, about, avatar, verified, username }) {
  const res = await fetch(`${API_BASE_URL}/organizations`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, owner, about, avatar, verified, username })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Failed to create');
  }
  const data = await res.json();
  await fetchOrgs();
  return data.organization;
}

export async function updateOrg(id, updates) {
  const res = await fetch(`${API_BASE_URL}/organizations/${id}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Failed to update');
  }
  const data = await res.json();
  await fetchOrgs();
  return data.organization;
}

export async function deleteOrg(id) {
  const res = await fetch(`${API_BASE_URL}/organizations/${id}`, {
    method: 'DELETE',
    credentials: 'include'
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Failed to delete');
  }
  await fetchOrgs();
}

export async function addMember(orgId, userIdOrIds) {
  const body = Array.isArray(userIdOrIds) ? { userIds: userIdOrIds } : { userId: userIdOrIds };
  const res = await fetch(`${API_BASE_URL}/organizations/${orgId}/members`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Failed to add member');
  }
  const data = await res.json();
  await fetchOrgs();
  return data.organization;
}

export async function removeMember(orgId, userId) {
  const res = await fetch(`${API_BASE_URL}/organizations/${orgId}/members/${userId}`, {
    method: 'DELETE',
    credentials: 'include'
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Failed to remove member');
  }
  const data = await res.json();
  await fetchOrgs();
  return data.organization;
}

export function isOrgOwner(org, currentUser) {
  if (!org || !org.owner || !currentUser) return false;
  const oid = typeof org.owner === 'object' ? org.owner._id : org.owner;
  return !!(oid && oid.toString() === currentUser._id);
}

export function isOrgMember(org, currentUser) {
  if (!org || !org.members || !currentUser) return false;
  const userId = currentUser._id;
  return org.members.some(m => {
    const mid = typeof m === 'object' ? m._id : m;
    return !!(mid && mid.toString() === userId);
  });
}

export function getOrgsForUser(currentUser) {
  return cachedOrgs.filter(org => {
    return isOrgOwner(org, currentUser) || isOrgMember(org, currentUser);
  });
}
