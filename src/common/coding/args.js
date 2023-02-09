import { encode as encodeValue, decode as decodeValue } from './struct.js';
import { keyStep, keyAfter, keyBefore } from '../ops/step.js';
import {
  MIN_KEY,
  MAX_KEY,
  errIf,
  isEmpty,
  isPlainObject,
  isDef,
  isMaxKey,
  isMinKey,
  cmp,
} from '../util.js';

function decodeBound(bound) {
  const { key, step } = keyStep(bound);
  if (isMinKey(key) || isMaxKey(key)) return { step };
  const value = decodeValue(key);
  return { key: value, step };
}

const pageProps = {
  $all: 1,
  $first: 1,
  $last: 1,
  $after: 1,
  $before: 1,
  $since: 1,
  $until: 1,
  $cursor: 1,
};

export function splitArgs(arg) {
  const page = {};
  const filter = {};
  for (const p in arg) (p in pageProps ? page : filter)[p] = arg[p];
  return [
    isEmpty(page) ? undefined : page,
    isEmpty(filter) ? undefined : filter,
  ];
}

export function encode(arg) {
  if (!isPlainObject(arg)) return { key: encodeValue(arg) };

  const [page, filter] = splitArgs(arg);
  errIf('page_and_filter', page && filter, arg);

  if (!page) return { key: encodeValue(filter || {}) };

  const { $cursor, ...range } = page;
  // @ts-ignore
  const { $first, $all, $last, $after, $before, $since, $until } = range;
  const hasRange = !isEmpty(range);

  errIf('first_and_last', isDef($first) && isDef($last), arg);
  errIf('all_and_last', isDef($all) && isDef($last), arg);
  errIf('all_and_first', isDef($first) && isDef($all), arg);
  errIf('after_and_since', isDef($after) && isDef($since), arg);
  errIf('before_and_until', isDef($before) && isDef($until), arg);
  errIf('cursor_and_range_arg', isDef($cursor) && hasRange, arg);

  let [key, end] = hasRange ? [MIN_KEY, MAX_KEY] : [];

  if (isDef($cursor)) key = encodeValue($cursor);
  if (isDef($after)) key = keyAfter(encodeValue($after));
  if (isDef($before)) end = keyBefore(encodeValue($before));
  if (isDef($since)) key = encodeValue($since);
  if (isDef($until)) end = encodeValue($until);

  if (isDef($last)) [key, end] = [end, key];

  const node = { key };
  if (isDef(end)) node.end = end;
  if ($first || $last) node.limit = $first || $last;

  return node;
}

export function decode(node) {
  const { key, end, limit } = node;

  errIf('no_key', !isDef(key));
  errIf('limit_without_end', isDef(limit) && !isDef(end));

  const kParts = decodeBound(key);
  if (!isDef(end) || cmp(key, end) === 0) return kParts.key;

  const eParts = decodeBound(end);
  const reverse = cmp(key, end) > 0;
  const [lower, upper] = reverse ? [eParts, kParts] : [kParts, eParts];

  const args = {};

  if (limit) {
    args[reverse ? '$last' : '$first'] = limit;
  } else if (
    (isMinKey(key) && isMaxKey(end)) ||
    (isMinKey(end) && isMaxKey(key))
  ) {
    args.$all = true;
  }

  if (isDef(lower.key) && !isMinKey(lower.key)) {
    args[lower.step === 1 ? '$after' : '$since'] = lower.key;
  }

  if (isDef(upper.key) && !isMaxKey(upper.key)) {
    args[upper.step === -1 ? '$before' : '$until'] = upper.key;
  }

  return args;
}
