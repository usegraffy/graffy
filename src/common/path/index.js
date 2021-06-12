import { findFirst, isRange, isBranch } from '../node/index.js';
import { encodeArgs /* decodeArgs */ } from '../coding/index.js';

// function isRangeKey(key) {
//   return (
//     typeof key === 'object' &&
//     ('$all' in key ||
//       '$first' in key ||
//       '$last' in key ||
//       '$before' in key ||
//       '$after' in key ||
//       '$until' in key ||
//       '$since' in key)
//   );
// }

export function wrapValue(value, path, version = 0) {
  const node = { ...encodeArgs(path[path.length - 1]), value, version };
  return wrap([node], path.slice(0, -1), version);
}

export function wrap(graph, path, version = 0) {
  if (!Array.isArray(graph) || !graph.length) return;
  if (!Array.isArray(path)) throw Error('wrap.path_not_array ' + path);

  // if (isRangeKey(path[path.length - 1])) {
  //   const rangeKey = path.pop();
  //   const {
  //     $all,
  //     $first,
  //     $last,
  //     $before,
  //     $after,
  //     $until,
  //     $since,
  //     ...pathArg
  //   } = rangeKey;
  //
  //   graph = graph.map((node) => {
  //     const graphArg = decodeArgs(node);
  //     if (!isRangeKey(graphArg)) {
  //       return { ...encodeArgs(rangeKey), children: [node] };
  //     }
  //     const arg = { ...pathArg, ...graphArg };
  //     return { ...node, ...encodeArgs(arg) };
  //   });
  // }

  let children = graph;
  for (let i = path.length - 1; i >= 0; i--) {
    children = [{ ...encodeArgs(path[i]), version, children }];
  }
  return children;
}

export function unwrap(graph, path) {
  let children = graph;
  if (!Array.isArray(path)) throw Error('unwrap.path_not_array ' + path);
  // let rangeKey = isRangeKey(path[path.length - 1]) ? path.pop() : null;
  let node = { children };
  for (let i = 0; i < path.length; i++) {
    const { key } = encodeArgs(path[i]);
    children = node.children;
    if (!children) return null; // This path does not exist.
    node = children[findFirst(children, key)];
    if (!node || node.key > key) return undefined; // We lack knowledge.
    if (isRange(node)) return null; // This is known to be null.
  }
  // if (rangeKey) {
  //   throw Error('unimplemented.unwrap_range_path');
  // }
  return node.children || node.value;
}

export function wrapObject(object, path) {
  if (!Array.isArray(path)) throw Error('wrapObject.path_not_array ' + path);
  for (let i = path.length - 1; i >= 0; i--) {
    object = { [path[i]]: object };
  }
  return object;
}

export function unwrapObject(object, path) {
  if (!Array.isArray(path)) throw Error('unwrapObject.path_not_array ' + path);
  for (let i = 0; i < path.length; i++) {
    if (!object || typeof object !== 'object') return;
    object = object[path[i]];
  }
  return object;
}

export function remove(children, path) {
  if (!Array.isArray(path)) throw Error('del.path_not_array ' + path);
  if (!children) return null; // This path does not exist.
  if (!path.length) return []; // Remove everything.

  const key = path[0];
  const ix = findFirst(children, key);
  const node = children[ix];
  if (!node || node.key > key || isRange(node)) return children;

  // let filteredNode;
  if (path.length === 1) {
    // This is the final segment, delete the matching node from children.
    return children.slice(0, ix).concat(children.slice(ix + 1));
  }

  if (!isBranch(node)) return children;

  // Recurse into the next slice.
  const filteredChildren = remove(node.children, path.slice(1));
  if (filteredChildren === path.children) return children;
  const filteredNode = filteredChildren.length
    ? { ...node, children: filteredChildren }
    : [];
  return children.slice(0, ix).concat(filteredNode, children.slice(ix + 1));
}
