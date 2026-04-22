export function isRange(node) {
  return node && typeof node.end !== 'undefined';
}

export function isBranch(node) {
  return node && typeof node.children !== 'undefined';
}

export function isPrefix(node) {
  return node?.prefix;
}

export function isLink(node) {
  return node && typeof node.path !== 'undefined';
}

function normalizeVersion(version) {
  if (version instanceof Date) return version.valueOf();
  if (typeof version === 'bigint') return Number(version);
  return version;
}

export function compareVersion(left, right) {
  const a = normalizeVersion(left);
  const b = normalizeVersion(right);

  if (typeof a === 'number' && typeof b === 'number') {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  }

  if (typeof a === 'string' && typeof b === 'string') {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  }

  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

export function isOlder(node, version) {
  return (
    typeof node.version !== 'undefined' &&
    compareVersion(node.version, version) < 0
  );
}

export function isNewer(node, version) {
  return (
    typeof node.version !== 'undefined' &&
    compareVersion(node.version, version) > 0
  );
}
