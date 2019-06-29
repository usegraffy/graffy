// import { getIndex } from './getIndex';

export function wrap(children, path, clock) {
  if (!Array.isArray(path)) throw Error('wrap.path_not_array ' + path);
  for (let i = path.length - 1; i >= 0; i--) {
    children = [{ key: path[i], clock, children }];
  }
  return children;
}

// We don't need this yet.
//
// export function unwrap(children, path) {
//   if (!Array.isArray(path)) throw Error('unwrap.path_not_array ' + path);
//   let node;
//   for (let i = 0; i < path.length - 1; i++) {
//     const key = path[i];
//     if (!children) return null; // This path does not exist.
//     node = children[getIndex(children, key)];
//     if (!node || node[key] > key) return undefined; // We lack knowledge.
//     children = node.children;
//   }
//   return node;
// }
