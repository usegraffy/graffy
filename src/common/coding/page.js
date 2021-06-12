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

export function encode(arg) {
  if (!isArgObject(arg)) return { key: maybeEncode(arg) };

  const props = { page: {}, filter: {} };
  for (const p in arg) props[p in pageProps ? 'page' : 'filter'][p] = arg[p];

  const { page, filter } = props;

  if (!isEmpty(filter)) {
    return {
      key: maybeEncode(arg),
      ...(!isEmpty(page) ? { prefix: true, children: [encode(page)] } : {}),
    };
  }

  const { $cursor, ...range } = page;
  const { $first, $last, $after, $before, $since, $until } = range;
  const hasRange = !isEmpty(range);

  throwIf('first_and_$last', isDef($first) && isDef($last));
  throwIf('after_and_$since', isDef($after) && isDef($since));
  throwIf('before_and_$until', isDef($before) && isDef($until));
  throwIf('cursor_and_range_arg', isDef($cursor) && hasRange);

  let key, end;

  if (isDef($cursor)) key = maybeEncode($cursor);
  if (isDef($after)) key = keyAfter(maybeEncode($after));
  if (isDef($before)) end = keyBefore(maybeEncode($before));
  if (isDef($since)) key = maybeEncode($since);
  if (isDef($until)) end = maybeEncode($until);

  if (hasRange) {
    key = key || '';
    end = end || '' + '\uffff';
  }

  if (isDef($last)) [key, end] = [end, key];

  const node = { key };
  if (typeof end !== 'undefined') node.end = end;
  if ($first || $last) node.limit = $first || $last;

  return node;
}

/*

  Key and End might take one of these forms:

  filter.since .. filter.until
  since .. until
  filter.cursor
  filter OR cursor (not distinguished)
*/

function splitEncoded(encodedKey) {
  if (encodedKey[0] === '\0') {
    const parts = encodedKey.slice(1).split('.');
    const [prefix, cursor] = [undefined, ...parts].slice(-2);
    const { key, step } = keyStep(cursor);
    const value = key === '' || key === '\uffff' ? key : decodeValue(key);
    return { prefix, cursor, value, step };
  } else {
    const { key, step } = keyStep(encodedKey);
    return { cursor: encodedKey, value: key, step };
  }
}

export function decode(node) {
  if (typeof node === 'string') return [node];
  const { key, end, limit, prefix, children } = node;
  if (key[0] !== '\0' && !prefix && !isDef(end)) return [key];

  throwIf('no_key', !isDef(key));
  throwIf('prefix_and_end', isDef(prefix) && isDef(end));
  throwIf('limit_without_end', isDef(limit) && !isDef(end));

  if (prefix) {
    const filter = decodeValue(key.slice(0));
    return children.map((child) => ({ ...filter, ...decode(child) }));
  }

  const args = {};
  if (limit) args[key < end ? '$first' : '$last'] = limit;

  const kParts = splitEncoded(key);
  if (kParts.prefix) Object.assign(args, decodeValue(kParts.prefix));

  if (typeof end === 'undefined') {
    if (isEmpty(args)) return kParts.value;
    args.$cursor = kParts.value;
    return args;
  }

  const eParts = splitEncoded(end);

  throwIf('prefix_mismatch', eParts.prefix !== kParts.prefix);

  const [lower, upper] =
    eParts.cursor > kParts.cursor ? [kParts, eParts] : [eParts, kParts];

  if (lower.cursor !== '') {
    args[lower.step === 1 ? '$after' : '$since'] = lower.value;
  }

  if (upper.cursor !== '\uffff') {
    args[upper.step === -1 ? '$before' : '$until'] = upper.value;
  }

  return args;
}
