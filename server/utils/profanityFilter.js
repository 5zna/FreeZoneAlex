const blocked = ['badword1', 'badword2'];

export function containsProfanity(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return blocked.some(w => lower.includes(w));
}
