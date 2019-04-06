/*
  Query Node
  [
    { after, before, first, last, value }
  ]
  Sorted by:
    - key, then
    - before if last is defined else after

  Graph Node

  [
    { key, after, before, value }
  ]
  Sorted by:
    - key or after

  Example
  [
    { key: key1, value: value1 },
    { after: key1, before: key2, value: null }
    { key: key2, value: value2 }
    { after: key2, before: key3, value: null}
  ]
*/

function keyCompare(k, l) {
  return k === l ? 0 : k > l ? 1 : -1;
}

function gKeyOverlaps(k, l) {
  if (k.key && l.key) {
    if (keyCompare(k.key, l.key) === 0) return true;
    return false;
  }
}

function gMergeDiff(m, n) {
  /* Set m to m + n and return n - m */
  const diff = [];
  let i = 0;
  let j = 0;

  while (i < m.length || j < n.length) {
    if (m[i] && n[j] && gKeyOverlaps(m[i], n[j])) {
      m.splice(i, 1, ...split(m[1], n[j]));
    }
  }
}
