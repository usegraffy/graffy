import { isBranch, isRange, getIndex, getLastIndex } from '../node';
import { keyAfter, keyBefore } from './step';

export default function sieve(current, changes, result = []) {
  let index = 0;
  for (const change of changes) {
    index = isRange(change)
      ? insertRange(current, change, result, index)
      : insertNode(current, change, result, index);
  }
  return result;
}

export function insertRange(current, change, result, start = 0) {
  const { key, end } = change;
  const keyIx = getIndex(current, key, start);
  const endIx = getLastIndex(current, end, keyIx);

  if (
    keyIx === endIx &&
    !(current[keyIx] && current[keyIx].key <= key && current[keyIx].end >= end)
  ) {
    // This range does not overlap with any existing data. Ignore it.
    return keyIx;
  }

  const appliedChange = [];
  let currentKey = change.key;
  for (let i = keyIx; i < endIx; i++) {
    const node = current[i];
    // We treat a negative version as a non-existent node
    // as this is a hack used by subscribe.
    if (isRange(node) && node.version >= 0) {
      if (node.key > currentKey) {
        appliedChange.push({
          key: currentKey,
          end: keyBefore(node.key),
          version: change.version,
        });
      }
      currentKey = keyAfter(node.end);
    } else {
      if (getNewerChange(node, change)) {
        appliedChange.push({
          key: currentKey,
          end: keyBefore(node.key),
          version: change.version,
        });
        currentKey = keyAfter(node.key);
      }
    }
    if (currentKey >= change.end) {
      break;
    }
  }

  if (currentKey <= change.end) {
    appliedChange.push({
      key: currentKey,
      end: change.end,
      version: change.version,
    });
  }

  if (appliedChange.length) result.push(...appliedChange);

  // If current contains nodes that are newer than this range, keep them.
  // We do this by merging them back into insertions first.
  const insertions = [change];
  for (let i = keyIx; i < endIx; i++) {
    const node = current[i];
    if (isRange(node)) {
      // console.log('Sieve Range-Range', debug(change), debug(node));
      insertions.push(...mergeRanges(insertions.pop(), node));
    } else {
      // console.log('Sieve Change-Node', debug(change), debug(node));
      insertNode(insertions, node, [], insertions.length - 1);
    }
  }

  // console.log('Sieve:insertions', debug(insertions));

  current.splice(keyIx, endIx - keyIx, ...insertions);
  return keyIx + insertions.length;
}

function mergeRanges(base, node) {
  // assertVersion(node, base.version);
  // eslint-disable-next-line no-param-reassign
  if (node.version < base.version) [node, base] = [base, node];
  // Ensure node is newer than base

  return [
    base.key < node.key && { ...base, end: keyBefore(node.key) },
    node,
    base.end > node.end && { ...base, key: keyAfter(node.end) },
  ].filter(Boolean);
}

export function insertNode(current, change, result, start = 0) {
  const key = change.key;
  const index = getIndex(current, key, start);
  const node = current[index];

  if (node && node.key <= key) {
    // This change overlaps with something that exists.
    return isRange(node)
      ? insertNodeIntoRange(current, index, change, result)
      : updateNode(current, index, change, result);
  } else {
    // This change does not overlap with any existing knowledge. Skip it
    // current.splice(index, 0, change);
    return index;
  }
}

function insertNodeIntoRange(current, index, change, result) {
  const key = change.key;
  const range = current[index];
  const newChange = getNewerChange(change, range);
  const newNode = getNewerNode(change, range);
  if (!newChange) return;
  result.push(newChange);

  const insertions = [
    range.key < key && { ...range, end: keyBefore(key) },
    newNode,
    range.end > key && { ...range, key: keyAfter(key) },
  ].filter(Boolean);
  current.splice(index, 1, ...insertions);

  return index + insertions.length;
}

function updateNode(current, index, change, result) {
  const node = current[index];
  if (isBranch(change) && isBranch(node)) {
    // Both are branches: Recursively merge children.
    const nextResult = [];
    node.version = change.version;
    sieve(node.children, change.children, nextResult);
    if (nextResult.length) result.push({ ...change, children: nextResult });
  } else if (isBranch(node)) {
    // Current node is a branch but the change is a leaf; if the branch
    // has newer children, ignore the change and keep only those children;
    // Otherwise, discard the branch and keep the change.
    const newNode = getNewerNode(node, change);
    current[index] = newNode || change;
    if (!newNode) result.push(change);
    // TODO: In the case of partial removal, what should result be?
  } else {
    // Current node is a leaf. Replace with the change if it is newer.
    const newChange = getNewerChange(change, node);
    const newNode = getNewerNode(change, node);
    if (newNode) current[index] = newNode;
    // console.log(current);
    if (
      newChange &&
      (change.value !== node.value || !isPathEqual(change.path, node.path))
    ) {
      result.push(newChange);
    }
  }
  return index + 1;
}

function isPathEqual(first, second) {
  if (!first && !second) return true;
  if (!first || !second) return false;
  if (first.length !== second.length) return false;
  for (let i = 0; i < first.length; i++) {
    if (first[i] !== second[i]) return false;
  }
  return true;
}

function getNewerNode(node, base) {
  if (isBranch(node)) {
    const emptyNode = { key: '', end: '\uffff', version: base.version };
    const children = [emptyNode];
    sieve(children, node.children);
    return children.length === 1 && children[0] === emptyNode
      ? null
      : { ...node, children };
  } else {
    // assertVersion(node, version);
    return node.version >= base.version ? node : null;
  }
}

function getNewerChange(node, base) {
  if (isBranch(node)) {
    const children = node.children.filter((child) =>
      getNewerChange(child, base),
    );
    return children.length && { ...node, children };
  } else {
    // assertVersion(node, version);
    return node.version >= base.version ? node : null;
  }
}

// function assertVersion(node, version) {
//   // if (node.version === version) {
//   //   throw Error('merge.version_collision ' + [node.key, version].join(' '));
//   // }
// }
