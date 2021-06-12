import { encode as encodeValue, decode as decodeValue } from './struct.js';
import { keyStep, keyAfter, keyBefore } from '../ops/step.js';
import { throwIf, isEmpty, isArgObject, isDef } from '../util.js';

function maybeEncode(value) {
  return typeof value === 'string' ? value : '\0' + encodeValue(value);
}

const pageProps = {
  $first: 1,
  $last: 1,
  $after: 1,
  $before: 1,
  $since: 1,
  $until: 1,
  $cursor: 1,
};

export function splitArgs(arg) {
  const props = { page: {}, filter: {} };
  for (const p in arg) props[p in pageProps ? 'page' : 'filter'][p] = arg[p];
  return props;
}

export function encode(arg) {
  if (!isArgObject(arg)) return { key: maybeEncode(arg) };

  const { page, filter } = splitArgs(arg);

  throwIf('empty_args', isEmpty(page) && isEmpty(filter));
  throwIf('page_and_filter', !isEmpty(page) && !isEmpty(filter));

  if (!isEmpty(filter)) return { key: maybeEncode(filter) };

  const { $cursor, ...range } = page;
  const { $first, $last, $after, $before, $since, $until } = range;
  const hasRange = !isEmpty(range);

  throwIf('first_and_$last', isDef($first) && isDef($last));
  throwIf('after_and_$since', isDef($after) && isDef($since));
  throwIf('before_and_$until', isDef($before) && isDef($until));
  throwIf('cursor_and_range_arg', isDef($cursor) && hasRange);

  let [key, end] = hasRange ? ['', '\uffff'] : [];

  if (isDef($cursor)) key = maybeEncode($cursor);
  if (isDef($after)) key = keyAfter(maybeEncode($after));
  if (isDef($before)) end = keyBefore(maybeEncode($before));
  if (isDef($since)) key = maybeEncode($since);
  if (isDef($until)) end = maybeEncode($until);

  if (isDef($last)) [key, end] = [end, key];

  const node = { key };
  if (typeof end !== 'undefined') node.end = end;
  if ($first || $last) node.limit = $first || $last;

  return node;
}

function maybeDecode(encodedKey) {
  if (encodedKey[0] === '\0') {
    const cursor = encodedKey.slice(1);
    const { key, step } = keyStep(cursor);
    const value = key === '' || key === '\uffff' ? key : decodeValue(key);
    return { cursor, value, step };
  } else {
    const { key, step } = keyStep(encodedKey);
    return { cursor: encodedKey, value: key, step };
  }
}

export function decode(node) {
  if (typeof node === 'string') return node;
  const { key, end, limit } = node;
  if (key[0] !== '\0' && (!isDef(end) || end === key)) return key;

  throwIf('no_key', !isDef(key));
  throwIf('limit_without_end', isDef(limit) && !isDef(end));

  const args = {};
  if (limit) args[key < end ? '$first' : '$last'] = limit;

  const kParts = maybeDecode(key);
  if (!isDef(end)) return kParts.value;

  const eParts = maybeDecode(end);
  const [lower, upper] = key < end ? [kParts, eParts] : [eParts, kParts];

  if (lower.cursor !== '') {
    args[lower.step === 1 ? '$after' : '$since'] = lower.value;
  }

  if (upper.cursor !== '\uffff') {
    args[upper.step === -1 ? '$before' : '$until'] = upper.value;
  }

  return args;
}
