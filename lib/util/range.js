import { sortedIndex, sortedLastIndex, sortedLastIndexBy } from 'lodash';
import { META_KEY, START, END } from './constants';

export const RANGE_PATTERN = /^([^*]*)(\*+)([^*]*)(\**)([^*]*)$/;

export function isRange(key) {
  return !!key.match(RANGE_PATTERN);
}

export function isSet(key) {
  return key.includes(',');
}

export function getRange(key) {
  const match = key.match(RANGE_PATTERN);
  if (!match) return null;

  // eslint-disable-next-line no-unused-vars
  const [ _, a, l, b, r, c ] = match;
  const int = s => parseInt(s, 10);
  if (l === '**' && a && c) return { $after: a, $before: c, $last: int(b) };
  if (r === '**' && c) return { $after: a, $before: c, $first: int(b) };
  if (l === '**' && b && c) return { $before: c, $last: int(b) };
  if (r === '**') return { $after: a, $first: int(b) };
  if (l === '**' && b) return { $last: int(b) };
  if (l === '**') return { $first: int(a) };
  if (a && c) return { $last: int(a), $first: int(c), around: b };
  // if (r && c) return { $first: int(c), $after: b };
  // if (r) return { $last: int(a), $after: b };
  if (a && b) return { $after: a, $before: b };
  if (a) return { $after: a };
  if (b) return { $before: b };
  return { $all: true };
}

export function intersect(range, page) {
  if (range.$all) return page.keys;

  const startKey = page.startKey;
  const endKey = page.endKey;

  function contains(k) {
    return (startKey === START || k === END || k >= startKey) &&
      (endKey === END || k === START || k <= endKey);
  }

  const startOfRange = contains(range.$after || START)
    ? sortedIndex(page.keys, range.$after || START)
    : null;

  const endOfRange = contains(range.$before)
    ? sortedLastIndex(page.keys, range.$before || END)
    : null;

  if (startOfRange && endOfRange) {
    return page.keys.slice(startOfRange, endOfRange);
  }

  if (range.$first) {
    return startOfRange !== null
      ? page.keys.slice(startOfRange, startOfRange + range.$first)
      : [];
  }

  if (range.$last) {
    return endOfRange !== null
      ? page.keys.slice(endOfRange - range.$last, endOfRange)
      : [];
  }
}

const findPageIx = (pages, key) => {
  const compare = ({ startKey, endKey }) =>
    key < startKey ? -1 : (key > endKey ? 1 : 0);
  const ix = sortedLastIndexBy(pages, 0, compare);
  return pages[ix] && compare(pages[ix]) === 0 ? ix : -1;
};

export function getMatches(tree, key) {
  if (isSet(key)) {
    return key.split(',').reduce((a, k) => a.concat(getMatches(tree, k)), []);
  }

  if (!isRange(key)) return key in tree ? [key] : [];

  const range = getRange(key);
  const pages = tree[META_KEY];

  if (!pages) {
    // Trying to extract range from a collection without a page index.
    // What's the use case? What's the expected behavior?
    return Object.keys(tree);
  }

  // TODO: Complete this.

  const firstPageIx = range.$after ? findPageIx(pages, range.$after) : -1 ;
  const lastPageIx = range.$after ? findPageIx(pages, range.$after) : -1 ;


  throw Error('range.get_matching_unimplemented');
}
