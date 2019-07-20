export default function find(items, compare, first = 0, last = items.length) {
  while (first < last) {
    const ix = ((first + last) / 2) | 0;
    const d = compare(items[ix]);

    if (d < 0) {
      first = ix + 1;
    } else if (d > 0) {
      last = ix;
    } else {
      return ix;
    }
  }

  return first;
}

// export function findFirst(items, compare, first = 0, last = items.length) {
//   let ix = find(items, compare, first, last);
//   while (ix >= first && !compare(items[ix])) ix--;
//   return ix + 1;
// }
//
// export function findLast(items, compare, first = 0, last = items.length) {
//   let ix = find(items, compare, first, last);
//   while (ix <= last && !compare(items[ix])) ix++;
//   return ix;
// }
//
// export function findRange() {}
