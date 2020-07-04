import {
  isBranch,
  isRange,
  isLink,
  isOlder,
  getIndex,
  getLastIndex,
} from '../node';
import { keyAfter, keyBefore } from './step';
import { wrap, wrapValue } from '../path';
import merge from './merge';
import add from './add';

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

  addLinked(children) {
    if (this.root !== this) return this.root.addLinked(children);
    this.linked = this.linked || [];
    add(this.linked, children);
  }
}

export default function slice(graph, query, root) {
  let result = new Result(root);
  let currentQuery = query;
  while (currentQuery) {
    let index = 0;
    for (const queryNode of currentQuery) {
      if (isRange(queryNode)) {
        sliceRange(graph, queryNode, result);
      } else {
        const key = queryNode.key;
        index = getIndex(graph, key, index);
        // console.log('Index', graph, key, index);
        sliceNode(graph[index], queryNode, result);
      }
    }
    currentQuery = root ? undefined : result.linked;
    delete result.linked;
  }
  delete result.root;
  return result;
}

function sliceNode(graph, query, result) {
  const { key, version } = query;
  const { root } = result;
  // console.log('Slicing', graph, query);
  if (!graph || graph.key > key || isOlder(graph, version)) {
    // The node found doesn't match the query or it's too old.
    result.addUnknown(query);
  } else if (isRange(graph)) {
    // The graph is indicating that this value was deleted.
    if (isBranch(query)) {
      const { known } = slice(
        [{ key: '', end: '\uffff', version: graph.version }],
        query.children,
      );
      result.addKnown({ key, version: graph.version, children: known });
    } else {
      result.addKnown({ key, end: key, version: graph.version });
    }
  } else if (isBranch(graph) && isBranch(query)) {
    // Both sides are branches; recurse into them.
    const { known, unknown } = slice(graph.children, query.children, root);
    if (known) result.addKnown({ ...graph, children: known });
    if (unknown) result.addUnknown({ ...query, children: unknown });
  } else if (isLink(graph)) {
    result.addKnown(graph);
    result.addLinked(
      isBranch(query)
        ? wrap(query.children, graph.path, version)
        : wrapValue(query.value, graph.path, version),
    );
  } else if (isBranch(graph) && query.options && query.options.subtree) {
    // This option allows a query to say "give me the subtree under this"
    // without knowing specifically what's available. If using this, the
    // value of "unknown" is no longer reliable. It is intended for use in
    // optimistic updates.
    result.addKnown(graph);
  } else if (isBranch(graph) || isBranch(query)) {
    // One side is a branch while the other is a leaf; throw error.
    throw new Error('slice.leaf_branch_mismatch');
  } else {
    result.addKnown(graph);
  }
}

export function sliceRange(graph, query, result) {
  let { key, end, count, version } = query;
  if (count > 0) {
    for (let i = getIndex(graph, key); key <= end && count > 0; i++) {
      const node = graph[i];
      if (!node || key < node.key || isOlder(node, version)) break;
      if (isRange(node)) {
        result.addKnown(getOverlap(node, key, end));
      } else {
        sliceNode(node, { ...query, key }, result);
        count--;
      }
      key = keyAfter(node.end || node.key);
    }
  } else {
    for (let i = getLastIndex(graph, end) - 1; end >= key && count < 0; i--) {
      const node = graph[i];
      if (!node || end > (node.end || node.key) || isOlder(node, version))
        break;
      if (isRange(node)) {
        result.addKnown(getOverlap(node, key, end));
      } else {
        sliceNode(node, { ...query, key: end }, result);
        count++;
      }
      end = keyBefore(node.key);
    }
  }
  if (count && key < end) {
    const unknown = { ...query, key, end, count };
    result.addUnknown(unknown);
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
