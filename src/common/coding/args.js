import { encode as encodeValue, decode as decodeValue } from './struct.js';
import { keyStep, keyAfter, keyBefore } from '../ops/step.js';
import { errIf, isEmpty, isPlainObject, isEncodedKey, isDef } from '../util.js';

function maybeEncode(value) {
  return typeof value === 'string' ? value : '\0' + encodeValue(value);
}

function maybeDecode(string) {
  if (isEncodedKey(string)) {
    const { key, step } = keyStep(string.slice(1));
    const value = key === '' || key === '\uffff' ? key : decodeValue(key);
    return { key: value, step };
  } else {
    return keyStep(string);
  }
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
  if (!isPlainObject(arg)) return { key: maybeEncode(arg) };

  const [page, filter] = splitArgs(arg);
  errIf('page_and_filter', page && filter);

  if (!page) return { key: maybeEncode(filter || {}) };

  const { $cursor, ...range } = page;
  const { $first, $all, $last, $after, $before, $since, $until } = range;
  const hasRange = !isEmpty(range);

  errIf('first_and_last', isDef($first) && isDef($last));
  errIf('all_and_last', isDef($all) && isDef($last));
  errIf('all_and_first', isDef($first) && isDef($all));
  errIf('after_and_since', isDef($after) && isDef($since));
  errIf('before_and_until', isDef($before) && isDef($until));
  errIf('cursor_and_range_arg', isDef($cursor) && hasRange);

  let [key, end] = hasRange ? ['', '\uffff'] : [];

  if (isDef($cursor)) key = maybeEncode($cursor);
  if (isDef($after)) key = keyAfter(maybeEncode($after));
  if (isDef($before)) end = keyBefore(maybeEncode($before));
  if (isDef($since)) key = maybeEncode($since);
  if (isDef($until)) end = maybeEncode($until);

  if (isDef($last)) [key, end] = [end, key];

  const node = { key };
  if (isDef(end)) node.end = end;
  if ($first || $last) node.limit = $first || $last;

  return node;
}

export function decode(node) {
  if (typeof node === 'string') return node;
  const { key, end, limit } = node;
  if (!isEncodedKey(key) && (!isDef(end) || end === key)) return key;

  errIf('no_key', !isDef(key));
  errIf('limit_without_end', isDef(limit) && !isDef(end));

  const kParts = maybeDecode(key);
  if (!isDef(end)) return kParts.key;

  const eParts = maybeDecode(end);
  const [lower, upper] = key < end ? [kParts, eParts] : [eParts, kParts];

  const args = {};

  if (limit) {
    args[key < end ? '$first' : '$last'] = limit;
  } else if (lower.key === '' && upper.key === '\uffff') {
    args.$all = true;
  }

  if (lower.key !== '') {
    args[lower.step === 1 ? '$after' : '$since'] = lower.key;
  }

  if (upper.key !== '\uffff') {
    args[upper.step === -1 ? '$before' : '$until'] = upper.key;
  }

  return args;
}
