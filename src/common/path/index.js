import { getIndex, isRange, isBranch } from '../node';

export const PATH_SEPARATOR = '/';

export function makePath(path) {
  if (Array.isArray(path) && path.every((key) => typeof key === 'string')) {
    return path;
  }
  if (typeof path !== 'string') throw Error('makePath.path_not_string');
  if (!path.length || path === PATH_SEPARATOR) return [];

  const pathArray = path.split(PATH_SEPARATOR);
  return pathArray[0] === '' ? pathArray.slice(1) : pathArray;
}

export function wrapValue(value, path, version = 0) {
  const node = { key: path[path.length - 1], value, version };
  return wrap([node], path.slice(0, -1), version);
}

export function wrap(graph, path, version = 0) {
  if (!Array.isArray(graph) || !graph.length) return;
  if (!Array.isArray(path)) throw Error('wrap.path_not_array ' + path);
  let children = graph;
  for (let i = path.length - 1; i >= 0; i--) {
    children = [{ key: path[i], version, children }];
  }
  return children;
}

export function unwrap(graph, path) {
  let children = graph;
  if (!Array.isArray(path)) throw Error('unwrap.path_not_array ' + path);
  let node = { children };
  for (let i = 0; i < path.length; i++) {
    const key = path[i];
    children = node.children;
    if (!children) return null; // This path does not exist.
    node = children[getIndex(children, key)];
    if (!node || node.key > key) return undefined; // We lack knowledge.
    if (isRange(node)) return null; // This is known to be null.
  }
  return node.children || node.value;
}

export function remove(children, path) {
  if (!Array.isArray(path)) throw Error('del.path_not_array ' + path);
  if (!children) return null; // This path does not exist.
  if (!path.length) return []; // Remove everything.

  const key = path[0];
  const ix = getIndex(children, key);
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
