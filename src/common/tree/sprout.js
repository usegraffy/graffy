import merge from '../merge';
import isEmpty from 'lodash/isEmpty';
import cutQuery from './cutQuery';
import { isSet, isRange, getMatches } from '../range';
import { GONE_KEY } from '../constants';

function getUnknown(tree, query) {
  if (typeof tree === 'undefined') return query;
  if (typeof query !== 'object' || !query || tree[GONE_KEY]) return;

  let result = {};

  function addResult(key, subQuery) {
    if (isSet(key) || isRange(key)) {
      const { keys, unknown } = getMatches(tree, key);
      keys.forEach(k => getUnknown(tree[k], subQuery));
      if (unknown) result[unknown] = subQuery;
      return;
    }

    if (!(key in tree)) {
      result[key] = subQuery;
    } else {
      const unknown = getUnknown(tree[key], subQuery);
      if (unknown) result[key] = unknown;
    }
  }

  for (const key in query) addResult(key, query[key]);

  return isEmpty(result) ? undefined : result;
}

export default function sprout(root, rootQuery) {
  // eslint-disable-next-line no-unused-vars
  const [_, ...subQueries] = cutQuery(root, rootQuery);
  const nextQuery = merge(
    {},
    ...subQueries.map(subQuery => getUnknown(root, subQuery)),
  );
  return isEmpty(nextQuery) ? undefined : nextQuery;
}
