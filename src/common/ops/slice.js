import {
  isBranch,
  isRange,
  isLink,
  isOlder,
  findFirst,
  findLast,
} from '../node/index.js';
import { keyAfter, keyBefore } from './step.js';
import { wrap } from './path.js';
import merge from './merge.js';
import add from './add.js';
import { cmp, isMinKey, MAX_KEY, MIN_KEY } from '../util.js';

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
        index = findFirst(graph, key);
        sliceNode(graph[index], queryNode, result);
      }
    }
    currentQuery = root ? undefined : result.linked;
    delete result.linked;
  }
  delete result.root;
  // console.log(
  //   'slice:\n' + format(graph) + format(query) + format(result.known),
  // );
  return result;
}

function sliceNode(graph, query, result) {
  const { key, version } = query;
  const { root } = result;
  // console.log('Slicing', graph, query);
  if (!graph || cmp(graph.key, key) > 0 || isOlder(graph, version)) {
    // The node found doesn't match the query or it's too old.
    result.addUnknown(query);
  } else if (isRange(graph)) {
    // The graph is indicating that this value was deleted.
    if (isBranch(query)) {
      const { known } = slice(
        [{ key: MIN_KEY, end: MAX_KEY, version: graph.version }],
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
    if (graph.prefix && isRange(query)) {
      result.addLinked(wrap([query], graph.path, version, true));
    } else {
      result.addLinked(
        wrap(
          query.children || query.value,
          graph.path,
          version,
          graph.prefix || query.prefix,
        ),
      );
    }
  } else if (isBranch(graph)) {
    // The graph is a branch and query is requesting all children here.
    result.addKnown(graph);
  } else if (isBranch(query)) {
    // One graph is a leaf while the query is a leaf; return null.
    const { known } = slice(
      [{ key: MIN_KEY, end: MAX_KEY, version: graph.version }],
      query.children,
    );
    result.addKnown({ key, version: graph.version, children: known });
  } else {
    result.addKnown(graph);
  }
}

export function sliceRange(graph, query, result) {
  let { key, end, limit = Infinity, version } = query;
  const step = cmp(key, end) < 0 ? 1 : -1;

  // Prefixes are used to combine filtering and pagination. In schemas where
  // prefixes are expected but a particular graph does not have a filter, it
  // will have a prefix node with an empty string as key.
  if (isMinKey(graph[0].key) && graph[0].prefix && graph[0].children) {
    const { known, unknown } = slice(graph[0].children, [query], result.root);
    if (known) result.addKnown({ ...graph[0], children: known });
    if (unknown) result.addUnknown({ ...query[0], children: unknown });
    return;
  }

  if (cmp(key, end) < 0) {
    for (let i = findFirst(graph, key); cmp(key, end) <= 0 && limit > 0; i++) {
      const node = graph[i];
      if (!node || cmp(key, node.key) < 0 || isOlder(node, version)) break;
      if (isRange(node)) {
        result.addKnown(getOverlap(node, key, end));
      } else {
        sliceNode(node, { ...query, key }, result);
        limit--;
      }
      key = keyAfter(node.end || node.key);
    }
  } else {
    for (
      let i = findLast(graph, key) - 1;
      cmp(key, end) >= 0 && limit > 0;
      i--
    ) {
      const node = graph[i];
      if (!node || cmp(key, node.end || node.key) > 0 || isOlder(node, version))
        break;
      if (isRange(node)) {
        result.addKnown(getOverlap(node, end, key));
      } else {
        sliceNode(node, { ...query, key }, result);
        limit--;
      }
      key = keyBefore(node.key);
    }
  }
  if (limit && (step < 0 ? cmp(key, end) > 0 : cmp(key, end) < 0)) {
    const unknown = { ...query, key, end, limit };
    result.addUnknown(unknown);
  }
}

function getOverlap(node, key, end) {
  if (cmp(node.key, key) >= 0 && cmp(node.end, end) <= 0) return node;
  return {
    ...node,
    key: cmp(node.key, key) > 0 ? node.key : key,
    end: cmp(node.end, end) < 0 ? node.end : end,
  };
}
