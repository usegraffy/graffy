export function isRange(node) {
  return node && typeof node.end !== 'undefined';
}

export function isBranch(node) {
  return node && typeof node.children !== 'undefined';
}

export function isPrefix(node) {
  return node && node.prefix;
}

export function isLink(node) {
  return node && typeof node.path !== 'undefined';
}

export function isEncoded(node) {
  return node && node.key[0] === '\0';
}

export function isOlder(node, version) {
  return typeof node.version !== 'undefined' && node.version < version;
}

export function isNewer(node, version) {
  return typeof node.version !== 'undefined' && node.version > version;
}
