import { find } from '../util.js';

export function findFirst(children, target) {
  return find(children, ({ key, end }) => {
    if (key === target || (end && key < target && end >= target)) return 0;
    if (key < target) return -1;
    return 1;
  });
}

export function findLast(children, end, first, last) {
  const ix = findFirst(children, end, first, last);
  return children[ix] && children[ix].key <= end ? ix + 1 : ix;
}
