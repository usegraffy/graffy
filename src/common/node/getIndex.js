import find from './find';

export function getIndex(children, target) {
  return find(children, ({ key, end }) => {
    if (key === target || (end && key < target && end >= target)) return 0;
    if (key < target) return -1;
    return 1;
  });
}

export function getLastIndex(children, end, first, last) {
  const ix = getIndex(children, end, first, last);
  return children[ix] && children[ix].key <= end ? ix + 1 : ix;
}
