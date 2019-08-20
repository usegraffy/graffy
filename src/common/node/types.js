export function isRange(node) {
  return node && typeof node.end !== 'undefined';
}

export function isBranch(node) {
  return node && typeof node.children !== 'undefined';
}

export function isLink(node) {
  return node && typeof node.path !== 'undefined';
}

export function isOlder(node, version) {
  return typeof node.version !== 'undefined' && node.version < version;
}

export function isNewer(node, version) {
  return typeof node.version !== 'undefined' && node.version > version;
}
