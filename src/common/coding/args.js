import { encode as encodeValue, decode as decodeValue } from './struct.js';
import { keyStep, keyAfter, keyBefore } from '../ops/step.js';
import { throwIf, isEmpty, isArgObject } from '../util.js';

function joinEncode(value, prefix) {
  if (!prefix && typeof value === 'string') {
    return value;
  } else {
    return (prefix || '\0') + encodeValue(value);
  }
}

function isDef(value) {
  return typeof value !== 'undefined';
}

export function encode(arg) {
  if (!isArgObject(arg)) return { key: joinEncode(arg, '') };

  const {
    $first,
    $last,
    $after,
    $before,
    $since,
    $until,
    $cursor,
    ...filter
  } = arg;
  const hasRangeArg = $before || $after || $since || $until || $first || $last;

  if (!hasRangeArg && !$cursor) return { key: joinEncode(arg, '') };

  throwIf('first_and_$last', isDef($first) && isDef($last));
  throwIf('after_and_$since', isDef($after) && isDef($since));
  throwIf('before_and_$until', isDef($before) && isDef($until));
  throwIf('cursor_and_range_arg', isDef($cursor) && hasRangeArg);

  let key, end;
  const prefix = isEmpty(filter) ? '' : '\0' + encodeValue(filter) + '.';

  if (isDef($cursor)) key = joinEncode($cursor, prefix);
  if (isDef($after)) key = keyAfter(joinEncode($after, prefix));
  if (isDef($before)) end = keyBefore(joinEncode($before, prefix));
  if (isDef($since)) key = joinEncode($since, prefix);
  if (isDef($until)) end = joinEncode($until, prefix);

  if (hasRangeArg) {
    key = key || prefix;
    end = end || prefix + '\uffff';
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
  if (typeof node === 'string') return node;
  const { key, end, limit } = node;
  if (key[0] !== '\0' && typeof end === 'undefined') return key;

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
