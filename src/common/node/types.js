export function isRange(node) {
  return node && typeof node.end !== 'undefined';
}

export function isBranch(node) {
  return node && typeof node.children !== 'undefined';
}

export function isLink(node) {
  return node && typeof node.path !== 'undefined';
}

export function isOlder(node, clock) {
  return typeof node.clock !== 'undefined' && node.clock < clock;
}

export function isNewer(node, clock) {
  return typeof node.clock !== 'undefined' && node.clock > clock;
}
