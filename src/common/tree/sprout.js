// import merge from 'lodash/merge';
// import isEmpty from 'lodash/isEmpty';
// import { wrap, getNode } from '../path';
// import { isSet, isRange, getMatches } from '../range';
// import { LINK_KEY, GONE_KEY } from '../constants';

// export default function sprout(root, rootQuery) {
//   let layers = [];
//   function doSprout(tree, query, path) {
//     if (typeof tree !== 'object' || !tree) return;
//     if (typeof query !== 'object' || !query) return;
//     if (tree[GONE_KEY]) return;
//
//     const link = tree[LINK_KEY];
//     if (link) {
//       tree = getNode(root, link);
//       if (!tree) {
//         layers.push(wrap(query, link));
//         return;
//       }
//     }
//
//     function addResult(key, subQuery) {
//       if (isSet(key) || isRange(key)) {
//         getMatches(tree, key).keys.forEach(k => addResult(k, subQuery));
//         return;
//       }
//
//       if (key in tree) {
//         doSprout(tree[key], subQuery, path.concat(key));
//       }
//     }
//
//     for (const key in query) addResult(key, query[key]);
//   }
//
//   doSprout(root, rootQuery, []);
//   const nextQuery = merge({}, ...layers);
//   return isEmpty(nextQuery) ? undefined : nextQuery;
// }

import merge from 'lodash/merge';
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
