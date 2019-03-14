import { number, string, boolean, object } from './scalar';
import { tuple, struct } from './tuple';
import { map } from './map';

export function type(query) {
  if (typeof query !== 'object') throw Error('type.define.typeof_query');
  if (query.base) return query;

  if (Array.isArray(query)) {
    if (query.length === 0) throw Error('type.define.query_length');
    if (query.length === 1) return map(type(query[0]), boolean);
    if (query.length === 2) return map(type(query[0]), type(query[1]));
    return map(
      tuple(query.slice(0, -1).map(type)),
      type(query[query.length - 1]),
    );
  }

  const structQuery = {};
  for (const prop in query) structQuery[prop] = type(query[prop]);
  return struct(structQuery);
}

export { number, string, boolean, object, tuple, struct, map };
