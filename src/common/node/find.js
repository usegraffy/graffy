import { cmp, find } from '../util.js';

export function findFirst(children, target, first, last) {
  return find(
    children,
    ({ key, end }) => {
      const keyCmp = cmp(key, target);
      const endCmp = end && cmp(end, target);
      if (end && keyCmp < 0 && endCmp >= 0) return 0;
      return keyCmp;
    },
    first,
    last,
  );
}

export function findLast(children, end, first, last) {
  const ix = findFirst(children, end, first, last);
  return children[ix] && cmp(children[ix].key, end) <= 0 ? ix + 1 : ix;
}
