export default function getIndex(children, key, first, last) {
  first = typeof first === 'undefined' ? 0 : first;
  last = typeof last === 'undefined' ? children.length : last;
  if (first >= last) return first;
  const ix = ((first + last) / 2) | 0;
  if (children[ix] && key > children[ix].key) {
    return getIndex(children, key, ix + 1, last);
  } else if (children[ix - 1] && key <= children[ix - 1].key) {
    return getIndex(children, key, first, ix - 1);
  } else {
    return ix;
  }
}
