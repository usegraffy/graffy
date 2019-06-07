export function isRange(node) {
  return node && typeof node.end !== 'undefined';
}

export function isBranch(node) {
  return node && typeof node.children !== 'undefined';
}
