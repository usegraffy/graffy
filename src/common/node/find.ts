import { cmp, find } from '../util.ts';

export function findFirst(children, target, first = 0, last = children.length) {
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

export function findLast(children, end, first = 0, last = children.length) {
  const ix = findFirst(children, end, first, last);
  return children[ix] && cmp(children[ix].key, end) <= 0 ? ix + 1 : ix;
}
