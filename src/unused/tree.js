// function isScalar(value) {
//   return typeof value !== 'undefined' && typeof value !== 'object';
// }
//
// export function overlaps(tree1, tree2) {
//   return cowalk(
//     tree1,
//     tree2,
//     (node1, node2, next) => {
//       if (isScalar(node1) || isScalar(node2)) return true;
//       return next();
//     },
//     false,
//   );
// }
//
// // Find payloads in a subscriber tree
// export function getPayloads(object, changes, listeners) {
//   if (typeof listeners === 'undefined' || typeof changes === 'undefined')
//     return;
//   if (listeners[KEYS] && listeners[KEYS].length) {
//     let added = [],
//       removed = [];
//     if (!isLeaf(changes)) {
//       for (const prop in changes) {
//         if (changes[prop] === null && hasProp(object, prop)) removed.push(prop);
//         if (changes[prop] !== null && !hasProp(object, prop)) added.push(prop);
//       }
//     }
//     if (!isLeaf(object) && changes === null) {
//       for (const prop in object) removed.push(prop);
//     }
//     if (added.length || removed.length) {
//       try {
//         for (const fn of listeners[KEYS]) fn(added, removed);
//       } catch (e) {
//         if (process.env.NODE_ENV !== 'production') throw e;
//       }
//     }
//   }
//
//   if (listeners[VALUE] && listeners[VALUE].length) {
//     try {
//       for (const fn of listeners[VALUE]) fn(changes);
//     } catch (e) {
//       if (process.env.NODE_ENV !== 'production') throw e;
//     }
//   }
//
//   for (const prop in listeners) {
//     if (hasProp(changes, prop) || (changes === null && hasProp(object, prop)))
//       invokeListeners(
//         object && object[prop],
//         changes && changes[prop],
//         listeners[prop],
//       );
//   }
// }
//
// /*
//   Given the current state and the proposed change tree, returns a reduced tree
//   containing only those branches that have changes.
//
//   If replace is true, sets all props of state not in change to null.
// */
// function diff(state, change, replace) {
//   let result;
//
//   function isEqual(st, ch) {
//     return st === ch || (typeof st === 'undefined' && ch === null);
//   }
//
//   if (isEqual(state, change)) return;
//   if (isLeaf(change) || isLeaf(state)) return change;
//
//   for (const prop in change) {
//     const difference = isEqual(state[prop], change[prop])
//       ? undefined
//       : !hasProp(state, prop) || isLeaf(change, prop) || isLeaf(state, prop)
//       ? change[prop]
//       : diff(state[prop], change[prop], replace);
//
//     if (typeof difference !== 'undefined') {
//       result = result || {};
//       result[prop] = difference;
//     }
//   }
//
//   if (replace)
//     for (const prop in state) {
//       if (!hasProp(change, prop)) {
//         result = result || {};
//         result[prop] = null;
//       }
//     }
//
//   if (process.env.NODE_ENV !== 'production') return Object.freeze(result);
//   return result;
// }
