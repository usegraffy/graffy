import { getIndex } from './getIndex';
import { isRange, isBranch } from './nodeTypes';

export function wrap(children, path, clock) {
  if (!Array.isArray(path)) throw Error('wrap.path_not_array ' + path);
  for (let i = path.length - 1; i >= 0; i--) {
    children = [{ key: path[i], clock, children }];
  }
  return children;
}

export function unwrap(children, path) {
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
  return node.children || true;
}

export function remove(children, path) {
  if (!Array.isArray(path)) throw Error('del.path_not_array ' + path);
  if (!children) return null; // This path does not exist.
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
