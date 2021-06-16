import { findFirst, isRange, isBranch } from '../node/index.js';
import { encodeArgs /* decodeArgs */ } from '../coding/index.js';

export function wrapValue(value, path, version = 0) {
  const node = { ...encodeArgs(path[path.length - 1]), value, version };
  return wrap([node], path.slice(0, -1), version);
}

export function wrap(children, path, version = 0, prefix = false) {
  if (!Array.isArray(path)) throw Error('wrap.path_not_array ' + path);

  if (!path.length) return children;
  let i = path.length - 1;

  // If it is a plain value, make it a value node
  if (!Array.isArray(children)) {
    children = [{ ...encodeArgs(path[i--]), value: children, version }];
  } else {
    if (!children.length) return;
    children = [{ ...encodeArgs(path[i--]), version, children }];
  }

  if (prefix) children[0].prefix = true;
  while (i >= 0) children = [{ ...encodeArgs(path[i--]), version, children }];
  return children;
}

export function unwrap(children, path) {
  if (!Array.isArray(path)) throw Error('unwrap.path_not_array ' + path);

  let node = { children };
  for (let i = 0; i < path.length; i++) {
    const { key } = encodeArgs(path[i]);
    children = node.children;
    if (!children) return null; // This path does not exist.
    node = children[findFirst(children, key)];
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
