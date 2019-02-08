export default function overlaps(a, b) {
  for (const k in a) if (k in b) return true;
  return false;
}
