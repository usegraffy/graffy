// Avoid lodash.isEmpty for bundle size.

export default function isEmpty(obj) {
  for (const k in obj) return false;
  return true;
}
