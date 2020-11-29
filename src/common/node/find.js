export function find(items, compare, first = 0, last = items.length) {
  let currentFirst = first;
  let currentLast = last;
  while (currentFirst < currentLast) {
    // console.log(currentFirst, currentLast);
    const ix = ((currentFirst + currentLast) / 2) | 0;
    const d = compare(items[ix]);
    // console.log(ix, items[ix], d);

    if (d < 0) {
      currentFirst = ix + 1;
    } else if (d > 0) {
      currentLast = ix;
    } else {
      return ix;
    }
  }

  return currentFirst;
}

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
