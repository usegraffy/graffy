import splitQuery from './splitQuery';

export default function sprout(tree, query) {
  return splitQuery(tree, query).unknown;
}

// import merge from '../merge';
// import isEmpty from 'lodash/isEmpty';
// import cutQuery from './cutQuery';
// import { isRange, splitRange } from '../range';
//
// function getUnknown(tree, query) {
//   if (typeof tree === 'undefined') return query;
//   if (typeof query !== 'object' || !query || tree === null) return;
//
//   let result = {};
//
//   function addResult(key, subQuery) {
//     if (isRange(key)) {
//       const { keys, unknown } = splitRange(tree, key);
//       keys.forEach(k => getUnknown(tree[k], subQuery));
//       if (unknown) result[unknown] = subQuery;
//       return;
//     }
//
//     if (!(key in tree)) {
//       result[key] = subQuery;
//     } else {
//       const unknown = getUnknown(tree[key], subQuery);
//       if (unknown) result[key] = unknown;
//     }
//   }
//
//   for (const key in query) addResult(key, query[key]);
//
//   return isEmpty(result) ? undefined : result;
// }
//
// export default function sprout(root, rootQuery) {
//   const nextQuery = merge(
//     {},
//     ...cutQuery(root, rootQuery).map(subQuery => getUnknown(root, subQuery)),
//   );
//   return isEmpty(nextQuery) ? undefined : nextQuery;
// }
