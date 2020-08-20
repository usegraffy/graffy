import { encode as encodeValue, decode as decodeValue } from './struct.js';
import { keyStep, keyAfter, keyBefore } from '../graph/step.js';

function throwIf(message, condition) {
  if (condition) throw Error('arg_encoding.' + message);
}

export function encode(arg) {
  if (typeof arg === 'string') return { key: arg };
  const {
    filter,
    first,
    last,
    order,
    after,
    before,
    since,
    until,
    cursor,
    id,
  } = arg;
  if (id) return { key: id };
  const hasRangeArg = before || after || since || until || first || last;

  throwIf('first_and_last', first && last);
  throwIf('after_and_since', after && since);
  throwIf('before_and_until', before && until);
  throwIf('cursor_and_range_arg', cursor && hasRangeArg);

  let key = '';
  let end;
  let prefix = '\0';

  if (cursor) key = encodeValue(cursor);
  if (after) key = keyAfter(encodeValue(after));
  if (before) end = keyBefore(encodeValue(before));
  if (since) key = encodeValue(since);
  if (until) end = encodeValue(until);

  if (!cursor) {
    // No cursor means this is a range node.
    end = end || '\uffff';
    if (last) [key, end] = [end, key];
  }

  if (order || filter) {
    prefix += (filter ? encodeValue(filter) : '') + '.';
    prefix += (order ? encodeValue(order) : '') + '.';
  }

  const node = { key: prefix + key };
  if (typeof end !== 'undefined') node.end = prefix + end;
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
  id
*/

function decodeParts(key) {
  const parts = key.slice(1).split('.');
  return parts.length === 3
    ? [decodeValue(parts[0]), decodeValue(parts[1]), parts[2]]
    : [undefined, undefined, parts[0]];
}

export function decode(node) {
  if (typeof node === 'string') return { id: node };
  const { key, end, limit } = node;
  if (key[0] !== '\0') {
    throwIf(
      'unencoded_range:' + key.length + ' ' + key.charCodeAt(0),
      typeof end !== 'undefined' || limit,
    );
    return { id: key };
  }

  const args = {};
  if (limit) args[key < end ? 'first' : 'last'] = limit;

  const [filter, order, cursor] = decodeParts(key);
  if (filter) args.filter = filter;
  if (order) args.order = order;

  if (!end) {
    if (typeof cursor !== 'undefined') args.cursor = cursor;
    return args;
  }

  const [endFilter, endOrder, endCursor] = decodeParts(end);
  throwIf('prefix_mismatch', endFilter !== filter || endOrder !== order);
  const [lower, upper] =
    endCursor > cursor ? [cursor, endCursor] : [endCursor, cursor];

  if (lower !== '') {
    const { key, step } = keyStep(lower);
    args[step === 1 ? 'after' : 'since'] = decodeValue(key);
  }

  if (upper !== '\uffff') {
    const { key, step } = keyStep(upper);
    args[step === -1 ? 'before' : 'until'] = decodeValue(key);
  }

  return args;
}
