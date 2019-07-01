export { default as merge } from './merge';
export { default as slice } from './slice';
export { default as sieve } from './sieve';
export { isRange, isBranch, isLink, isOlder, isNewer } from './nodeTypes';
export { wrap, unwrap, remove } from './path';

// class Graph {
//   constructor(data) {
//     this.data = data;
//   }
//
//   put(changes) {
//     return merge(this.data, changes.data);
//   }
//
//   get(query) {
//     const { known, unknown } = slice(this.data, query.data);
//     return [new Graph(known), new Query(unknown)];
//   }
//
//   getSieve() {}
// }
//
// class Query {
//   constructor(data) {
//     this.data = data;
//   }
// }
//
// export function first() {}
// export function last() {}
// export function alias() {}
// export function query() {}
//
// export function graph(data) {
//   return new Graph(data);
// }
