import { encode as encodeValue, decode as decodeValue } from './struct.js';
import { keyStep, keyAfter, keyBefore } from '../ops/step.js';
import { throwIf, empty, isArgObject } from '../util.js';

function joinEncode(value, prefix) {
  if (!prefix && typeof value === 'string') {
    return value;
  } else {
    return (prefix || '\0') + encodeValue(value);
  }
}

export function encode(arg) {
  if (!isArgObject(arg)) {
    arg = { cursor: arg };
  }

  const { first, last, after, before, since, until, cursor, ...filter } = arg;
  const hasRangeArg = before || after || since || until || first || last;

  throwIf('first_and_last', first && last);
  throwIf('after_and_since', after && since);
  throwIf('before_and_until', before && until);
  throwIf('cursor_and_range_arg', cursor && hasRangeArg);

  let key, end;
  const prefix = empty(filter) ? '' : '\0' + encodeValue(filter) + '.';

  if (cursor) key = joinEncode(cursor, prefix);
  if (after) key = keyAfter(joinEncode(after, prefix));
  if (before) end = keyBefore(joinEncode(before, prefix));
  if (since) key = joinEncode(since, prefix);
  if (until) end = joinEncode(until, prefix);

  if (hasRangeArg) {
    key = key || prefix;
    end = end || prefix + '\uffff';
  }

  if (last) [key, end] = [end, key];

  const node = { key };
  if (typeof end !== 'undefined') node.end = end;
  if (first || last) node.limit = first || last;

  return node;
}

/*

  Key and End might take one of these forms:

  order.filter.since -> order.filter.until
  order.filter.cursor

  order..since -> order..until
  order..cursor

  .filter.since -> .filter.until
  .filter.cursor

  since -> until
  cursor

  .filter.
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
  if (limit) args[key < end ? 'first' : 'last'] = limit;

  const kParts = splitEncoded(key);
  if (kParts.prefix) Object.assign(args, decodeValue(kParts.prefix));

  if (typeof end === 'undefined') {
    if (empty(args) && !isArgObject(kParts.value)) return kParts.value;
    if (typeof kParts.value !== 'undefined') args.cursor = kParts.value;
    return args;
  }

  const eParts = splitEncoded(end);

  throwIf('prefix_mismatch', eParts.prefix !== kParts.prefix);

  const [lower, upper] =
    eParts.cursor > kParts.cursor ? [kParts, eParts] : [eParts, kParts];

  if (lower.cursor !== '') {
    args[lower.step === 1 ? 'after' : 'since'] = lower.value;
  }

  if (upper.cursor !== '\uffff') {
    args[upper.step === -1 ? 'before' : 'until'] = upper.value;
  }

  return args;
}
