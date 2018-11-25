import { sortedIndex, sortedLastIndex } from 'lodash';
import { PAGE_INFO, MIN_KEY, MAX_KEY } from './constants';
import { inter } from './interval';

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
  if (a && b) return { $after: a, $before: b };
  if (a) return { $after: a };
  if (b) return { $before: b };
  return { $all: true };
}


const min = (a, b) => a < b ? a : b;
const max = (a, b) => a > b ? a : b;

export function getMatches(tree, key) {
  if (isSet(key)) {
    return key.split(',').reduce((a, k) => a.concat(getMatches(tree, k)), []);
  }

  const range = getRange(key);
  if (!range) return key in tree ? [key] : [];
  if (range.$around) throw Error('getMatches.around.unimplemented');

  const minKey = range.$after || MIN_KEY;
  const maxKey = range.$before || MAX_KEY;
  const pages = inter(tree[PAGE_INFO] || [MIN_KEY, MAX_KEY], [minKey, maxKey]);
  if (
    range.$first && pages[0] !== minKey ||
    range.$last && pages[pages.length - 1] !== maxKey
  ) return [];

  const keys = Object.keys(tree).filter(k => k !== PAGE_INFO).sort();
  let minIx, maxIx;

  if (range.$first) {
    minIx = sortedIndex(keys, minKey);
    maxIx = Math.min(
      minIx + range.$first,
      sortedLastIndex(keys, min(maxKey, pages[1]))
    );
  } else if (range.$last) {
    maxIx = sortedLastIndex(keys, maxKey);
    minIx = Math.max(
      maxIx - range.$last,
      sortedIndex(keys, max(minKey, pages[pages.length - 2]))
    );
  } else {
    minIx = sortedIndex(keys, minKey);
    maxIx = sortedLastIndex(keys, maxKey);
  }

  // console.log('Range getMatches', range, keys, minIx, maxIx);
  return keys.slice(minIx, maxIx);
}
