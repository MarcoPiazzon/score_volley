export function sumStats(a = {}, b = {}) {
  const result = { ...a };
  for (const key in b) {
    result[key] = (result[key] || 0) + (b[key] || 0);
  }
  return result;
}
