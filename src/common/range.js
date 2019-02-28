import { sortedIndex, sortedLastIndex } from 'lodash';
import { PAGE_KEY, LINK_KEY, MIN_KEY, MAX_KEY } from './constants';
import { inter, diff } from './interval';

export const RANGE_PATTERN = /^([^*]*)(\*+)([^*]*)(\**)([^*]*)$/;

export function isRange(key) {
  return !!key.match(RANGE_PATTERN);
}

export function isSet(key) {
  return key.includes(',');
}

export function decode(key) {
  const match = key.match(RANGE_PATTERN);
  if (!match) throw Error('range.decode.bad_pattern');

  // eslint-disable-next-line no-unused-vars
  const [_, a, l, b, r, c] = match;
  if (l && r && l === r) throw Error('range.decode.bad_asterisks');

  const int = s => parseInt(s, 10);
  if (r !== '')
    return {
      after: a || MIN_KEY,
      before: c || MAX_KEY,
      [l === '**' ? 'last' : 'first']: int(b),
    };

  if (l === '*')
    return {
      after: a || MIN_KEY,
      before: b || MAX_KEY,
    };

  return {
    after: MIN_KEY,
    before: MAX_KEY,
    [b !== '' ? 'last' : 'first']: int(b || a),
  };
}

export function encode({ before, after, first, last }) {
  if (first && last) throw Error('range.encode.first_last');
  if (after === MIN_KEY) after = '';
  if (before === MAX_KEY) before = '';

  return [
    after,
    first && after ? '*' : '',
    last ? '**' : '',
    first || last || '*',
    first ? '**' : '',
    last && before ? '*' : '',
    before,
  ].join('');
}

const getKeys = tree =>
  Object.keys(tree)
    .filter(k => k !== PAGE_KEY && k !== LINK_KEY)
    .sort();

export function getMatches(tree, key) {
  if (isSet(key)) {
    return { keys: key.split(',') };
  }

  const { first, last, before, after } = decode(key);
  const treePage = tree[PAGE_KEY] || [MIN_KEY, MAX_KEY];
  const rangePage = inter(treePage, [after, before]);
  if (
    (first && after !== rangePage[0]) ||
    (last && before !== rangePage[rangePage.length - 1])
  ) {
    return { keys: [], known: [], unknown: key };
  }

  let minKey = last ? rangePage[rangePage.length - 2] : after;
  let maxKey = first ? rangePage[1] : before;

  const keys = getKeys(tree);
  let minIx = sortedIndex(keys, minKey);
  let maxIx = sortedLastIndex(keys, maxKey);

  let unknown;

  if (first) {
    if (maxIx - minIx >= first) {
      maxIx = minIx + first;
      maxKey = keys[maxIx - 1];
    } else {
      const remaining = {
        first: first - (maxIx - minIx) + 1,
        after: maxKey,
      };
      if (last) remaining.last = last;
      unknown = encode(remaining);
    }
  } else if (last) {
    if (maxIx - minIx >= last) {
      minIx = maxIx - last;
      minKey = keys[minIx];
    } else {
      const remaining = {
        last: last - (maxIx - minIx) + 1,
        before: minKey,
      };
      unknown = encode(remaining);
    }
  } else {
    unknown = diff([after, before], treePage)
      .map((val, i, diffs) =>
        i % 2
          ? null
          : encode({
              after: val,
              before: diffs[i + 1],
            }),
      )
      .filter(Boolean)
      .join(',');
  }

  return {
    keys: keys.slice(minIx, maxIx),
    known: inter(treePage, [minKey, maxKey]),
    unknown,
  };
}
