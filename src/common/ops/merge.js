import { findFirst, findLast, isBranch, isRange } from '../node/index.js';
import { MAX_KEY, MIN_KEY, cmp } from '../util.js';
import { keyAfter, keyBefore } from './step.js';

export default function merge(current, changes) {
  let index = 0;
  if (typeof changes === 'undefined') return current;
  for (const change of changes) {
    index = isRange(change)
      ? insertRange(current, change, index)
      : insertNode(current, change, index);
  }
  return current;
}

export function insertRange(current, change, start = 0) {
  const { key, end } = change;
  const keyIx = findFirst(current, key, start);
  const endIx = findLast(current, end, keyIx);

  // If current contains nodes that are newer than this range, keep them.
  // We do this by merging them back into insertions first.
  const insertions = [change];
  for (let i = keyIx; i < endIx; i++) {
    const node = current[i];
    if (isRange(node)) {
      insertions.push(...mergeRanges(insertions.pop(), node));
    } else {
      insertNode(insertions, node, insertions.length - 1);
    }
  }

  current.splice(keyIx, endIx - keyIx, ...insertions);
  return keyIx + insertions.length - 1;
}

function mergeRanges(base, node) {
  // assertVersion(node, base.version);
  if (node.version < base.version) [node, base] = [base, node];
  return [
    cmp(base.key, node.key) < 0 && { ...base, end: keyBefore(node.key) },
    node,
    cmp(base.end, node.end) > 0 && { ...base, key: keyAfter(node.end) },
  ].filter(Boolean);
}

export function insertNode(current, change, start = 0) {
  if (!current) throw new Error(`merge.insertNode: ${current}`);
  const key = change.key;
  const index = findFirst(current, key, start);
  const node = current[index];

  if (node && cmp(node.key, key) <= 0) {
    // This change overlaps with something that exists.
    return isRange(node)
      ? insertNodeIntoRange(current, index, change)
      : updateNode(current, index, change);
  }
  // This change does not overlap with any existing knowledge. Insert it
  current.splice(index, 0, change);
  return index + 1;
}

function insertNodeIntoRange(current, index, change) {
  const key = change.key;
  const range = current[index];
  const newChange = getNewer(change, range);
  if (!newChange) return;

  const insertions = [
    cmp(range.key, key) < 0 && { ...range, end: keyBefore(key) },
    newChange,
    cmp(range.end, key) > 0 && { ...range, key: keyAfter(key) },
  ].filter(Boolean);
  current.splice(index, 1, ...insertions);

  // Subtract 1 to keep the final range in consideration for future insertions.
  return index + insertions.length - 1;
}

function updateNode(current, index, change) {
  const node = current[index];
  if (isBranch(change) && isBranch(node)) {
    // Both are branches: Recursively merge children.
    merge(node.children, change.children);
  } else if (isBranch(node)) {
    // Current node is a branch but the change is a leaf; if the branch
    // has newer children, ignore the change and keep only those children;
    // Otherwise, discard the branch and keep the change.
    const newNode = getNewer(node, change);
    current[index] = newNode || change;
  } else {
    // Current node is a leaf. Replace with the change if it is newer.
    const newChange = getNewer(change, node);
    if (newChange) current[index] = newChange;
  }
  if (change.prefix) current[index].prefix = true;
  return index + 1;
}

function getNewer(node, base) {
  const { version } = base;
  if (isBranch(node)) {
    const children = [{ key: MIN_KEY, end: MAX_KEY, version }];
    merge(children, node.children);
    return children.length === 1 ? null : { ...node, children };
  }
  // assertVersion(node, version);
  return node.version >= version ? node : null;
}

// function assertVersion(node, version) {
//   // if (node.version === version) {
//   //   throw Error('merge.version_collision ' + [node.key, version].join(' '));
//   // }
// }
