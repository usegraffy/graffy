export function getIndex(children, key, first = 0, last = children.length) {
  if (first >= last) return shiftIntoRange(children, key, first);
  const ix = ((first + last) / 2) | 0;
  if (children[ix] && key > children[ix].key) {
    return getIndex(children, key, ix + 1, last);
  } else if (children[ix - 1] && key <= children[ix - 1].key) {
    return getIndex(children, key, first, ix - 1);
  } else {
    return shiftIntoRange(children, key, ix);
  }
}

function shiftIntoRange(children, key, ix) {
  return children[ix - 1] && children[ix - 1].end >= key ? ix - 1 : ix;
}

export function getLastIndex(children, end, first, last) {
  const ix = getIndex(children, end, first, last);
  return children[ix] && children[ix].key <= end ? ix + 1 : ix;
}
