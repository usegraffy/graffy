import { isBranch, isRange, isLink, isOlder } from './nodeTypes';
import { keyAfter, keyBefore } from './keyOps';
import merge from './merge';
import { getIndex, getLastIndex } from './getIndex';

class Result {
  constructor(root) {
    // When linked queries are added, they are forwarded to the root.
    this.root = root || this;
  }

  addKnown(node) {
    this.known = this.known || [];
    merge(this.known, [node]);
  }

  addUnknown(node) {
    this.unknown = this.unknown || [];
    this.unknown.push(node);
  }

  // addSieve(node) {
  //   this.sieve = this.sieve || [];
  //   merge(this.sieve, [node]);
  // }

  addLinked(children) {
    if (this.root !== this) return this.root.addLinked(children);
    this.linked = this.linked || [];
    merge(this.linked, children);
  }
}

export default function slice(graph, query, root) {
  let result = new Result(root);
  while (query) {
    let index = 0;
    for (const queryNode of query) {
      if (isRange(queryNode)) {
        sliceRange(graph, queryNode, result);
      } else {
        const key = queryNode.key;
        index = getIndex(graph, key, index);
        // console.log('Index', graph, key, index);
        sliceNode(graph[index], queryNode, result);
      }
    }
    query = result.linked;
    // if (query) console.log('Linked', query);
    delete result.linked;
  }
  delete result.root;
  return result;
}

function sliceNode(graph, query, result) {
  const { key, clock } = query;
  const { root } = result;
  // console.log('Slicing', graph, query);
  if (!graph || graph.key > key || isOlder(graph, clock)) {
    // The node found doesn't match the query or it's too old.
    result.addUnknown(query);
    // result.addSieve(query);
  } else if (isBranch(graph) && isBranch(query)) {
    // Both sides are branches; recurse into them.
    const { known, unknown } = slice(graph.children, query.children, root);
    if (known) result.addKnown({ ...graph, children: known });
    if (unknown) result.addUnknown({ ...query, children: unknown });
    // if (sieve) result.addSieve({ ...query, children: sieve });
  } else if (isLink(graph) && isBranch(query)) {
    result.addKnown(graph);
    // result.addSieve(query);
    result.addLinked(wrap(query.children, graph.path, clock));
  } else if (isBranch(graph) || isBranch(query)) {
    // One side is a branch while the other is a leaf; throw error.
    throw new Error('slice.leaf_branch_mismatch');
  } else if (isRange(graph)) {
    // result.addSieve(query);
    result.addKnown({ key, end: key, clock: graph.clock });
  } else {
    // result.addSieve(query);
    result.addKnown(graph);
  }
  return result;
}

function wrap(children, path, clock) {
  if (!Array.isArray(path)) throw Error('slice.path_not_array ' + path);
  for (let i = path.length - 1; i >= 0; i--) {
    children = [{ key: path[i], clock, children }];
  }
  return children;
}

export function sliceRange(graph, query, result) {
  let { key, end, count, clock } = query;
  if (count > 0) {
    for (let i = getIndex(graph, key); key <= end && count > 0; i++) {
      const node = graph[i];
      if (!node || key < node.key || isOlder(node, clock)) break;
      if (isRange(node)) {
        result.addKnown(getOverlap(node, key, end));
      } else {
        sliceNode(node, { ...query, key }, result);
        count--;
      }
      key = keyAfter(node.end || node.key);
    }
    // result.addSieve({ ...query, end: key, count: Infinity });
  } else {
    for (let i = getLastIndex(graph, end) - 1; end >= key && count < 0; i--) {
      const node = graph[i];
      if (!node || end > (node.end || node.key) || isOlder(node, clock)) break;
      if (isRange(node)) {
        result.addKnown(getOverlap(node, key, end));
      } else {
        sliceNode(node, { ...query, key: end }, result);
        count++;
      }
      end = keyBefore(node.key);
    }
    // result.addSieve({ ...query, key: end, count: Infinity });
  }
  if (count && key < end) {
    const unknown = { ...query, key, end, count };
    result.addUnknown(unknown);
    // result.addSieve(unknown);
  }
}

function getOverlap(node, key, end) {
  if (node.key >= key && node.end <= end) return node;
  return {
    ...node,
    key: node.key > key ? node.key : key,
    end: node.end < end ? node.end : end,
  };
}
