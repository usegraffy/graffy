import { isBranch, isRange, getIndex, getLastIndex } from '../node';
import { keyAfter, keyBefore } from './step';

export default function merge(current, changes) {
  let index = 0;
  for (const change of changes) {
    index = isRange(change)
      ? insertRange(current, change, index)
      : insertNode(current, change, index);
  }
  return current;
}

export function insertRange(current, change, start = 0) {
  const { key, end } = change;
  const keyIx = getIndex(current, key, start);
  const endIx = getLastIndex(current, end, keyIx);

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
  return keyIx + insertions.length;
}

function mergeRanges(base, node) {
  // assertVersion(node, base.version);
  // eslint-disable-next-line no-param-reassign
  if (node.version < base.version) [node, base] = [base, node];
  return [
    base.key < node.key && { ...base, end: keyBefore(node.key) },
    node,
    base.end > node.end && { ...base, key: keyAfter(node.end) },
  ].filter(Boolean);
}

export function insertNode(current, change, start = 0) {
  const key = change.key;
  const index = getIndex(current, key, start);
  const node = current[index];

  if (node && node.key <= key) {
    // This change overlaps with something that exists.
    return isRange(node)
      ? insertNodeIntoRange(current, index, change)
      : updateNode(current, index, change);
  } else {
    // This change does not overlap with any existing knowledge. Insert it
    current.splice(index, 0, change);
    return index + 1;
  }
}

function insertNodeIntoRange(current, index, change) {
  const key = change.key;
  const range = current[index];
  const newChange = getNewer(change, range);
  if (!newChange) return;

  const insertions = [
    range.key < key && { ...range, end: keyBefore(key) },
    newChange,
    range.end > key && { ...range, key: keyAfter(key) },
  ].filter(Boolean);
  current.splice(index, 1, ...insertions);

  return index + insertions.length;
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
  return index + 1;
}

function getNewer(node, base) {
  const { version } = base;
  if (isBranch(node)) {
    const children = [{ key: '', end: '\uffff', version }];
    merge(children, node.children);
    return children.length === 1 ? null : { ...node, children };
  } else {
    // assertVersion(node, version);
    return node.version >= version ? node : null;
  }
}

// function assertVersion(node, version) {
//   // if (node.version === version) {
//   //   throw Error('merge.version_collision ' + [node.key, version].join(' '));
//   // }
// }
