import { decode as decodeTree } from '../tree.js';

export default function decodeGraph(graph) {
  return decodeTree(graph, { isGraph: true });
}

/* import {
  isRange,
  isBranch,
  isLink,
  findFirst,
  findLast,
} from '../../node/index.js';
import { isEmpty } from '../../util.js';
import { keyAfter, keyBefore } from '../../ops/index.js';
import { decodeArgs, encodeQuery } from '../index.js';
const LINK_PLACEHOLDER = Symbol();

function descend(tree, path) {
  let node = tree;
  for (const key of path) {
    if (!node) return;
    if (Array.isArray(node)) node = node.props;
    if (!(key in node)) return undefined;
    node = node[key];
  }
  return node;
}

export default function decodeGraph(graph, query, links = []) {
  const result = graph && decodeChildren(graph, query, links);

  let link;
  while ((link = links.shift())) {
    const [from, key, path, args] = link;
    const node = descend(result, path);
    // console.log('resolving link', link, 'found', node, 'in', result);
    if (node === LINK_PLACEHOLDER) {
      // Try this link again later. This is to resolve multi-hop links.
      // TODO: Cycle detection.
      links.push(link);
    } else {
      // console.log('Replacing placeholder at', key, 'with', node);
      from[key] = node;
      if (typeof node === 'object' && node) {
        node.$ref = path;
        if (args) node.$key = args;
      }
    }
  }
  return result;
}

function decodeChildren(graph, query, links) {
  const resObj = {};

  let hasEncoded = false;
  let hasRanges = false;
  // First, we construct the result object
  for (const node of graph) {
    const key = node.key;
    if (key[0] === '\0') hasEncoded = true;

    if (isRange(node)) {
      if (key === node.end) {
        resObj[key] = null;
      } else {
        hasRanges = true;
      }
      continue;
    }
    if (isLink(node)) {
      links.push([resObj, key, node.path]);
      resObj[key] = LINK_PLACEHOLDER;
      continue;
    }
    if (isBranch(node)) {
      resObj[key] = decodeChildren(node.children, query?.[key], links);
      continue;
    }

    if (typeof node.value === 'object' && node.value) {
      // The API must appear to return the value directly, but when
      // JSON-stringified it returned object should be wrapped in a $val.
      const child = Object.create(node.value);
      child.$val = node.value;
      resObj[key] = child;
    } else {
      resObj[key] = node.value;
    }
  }

  if (hasRanges) {
    const putRanges = [];
    let last = null;
    for (let { key, end } of graph) {
      if (last) {
        if (last.end) {
          if (key === keyAfter(last.end)) {
            last.end = end || key;
            continue;
          }
        } else {
          if (key === keyAfter(last.key)) key = last.key;
        }
      }

      if (end && key !== end) {
        last = { key, end };
        putRanges.push(last);
      } else {
        last = { key };
      }
    }

    if (
      putRanges.length === 1 &&
      putRanges[0].key === '' &&
      putRanges[0].end === '\uffff'
    ) {
      resObj.$put = true;
    } else {
      resObj.$put = putRanges.map((rNode) => decodeArgs(rNode));
    }
  }

  if (query) {
    if (Array.isArray(query)) {
      if (query.length !== 1) throw Error('decodeGraph.multi_page');
      return makeArray(graph, query[0], links, resObj);
    } else if (isPaginated(query)) {
      return makeArray(graph, query, links, resObj);
    }
  }

  if (hasEncoded) {
    return makeArray(graph, null, links, resObj);
  }

  return resObj;
}

function isPaginated({ $key: key } = {}) {
  return (
    key &&
    (key.$first ||
      key.$last ||
      key.$after ||
      key.$before ||
      key.$since ||
      key.$until ||
      key.all)
  );
}

function isMinKey(key) {
  return key === '' || (key[0] === '\0' && key[key.length - 1] === '.');
}

function isMaxKey(key) {
  return (
    key === '\uffff' ||
    (key[0] === '\0' &&
      key[key.length - 2] === '.' &&
      key[key.length - 1] === '\uffff')
  );
}

function prefix(key) {
  if (key[0] === '\0') {
    const parts = key.split('.');
    return parts[parts.length - 2] ? parts[parts.length - 2] + '.' : '';
  }

  return '';
}

function makeArray(graph, query, links, object) {
  const resArr = [];

  if (query && isPaginated(query)) {
    const queryNode = encodeQuery(query)[0];
    graph = getRangeNodes(graph, queryNode);
  }

  for (const node of graph) {
    // console.log('node', node);

    const key = node.key;
    const child = object[key];

    if (typeof child === 'undefined' || child === null) continue;

    let args = decodeArgs(node);
    const { cursor, ...rest } = args;
    if (isEmpty(rest) && Array.isArray(cursor)) args = cursor;

    if (child === LINK_PLACEHOLDER) {
      links.push([resArr, resArr.length, node.path, args]);
      resArr.push(LINK_PLACEHOLDER); // Placeholder that will be replaced.
      continue;
    }

    if (typeof child === 'object' && child) child.$key = args;
    resArr.push(child);
  }

  // Add next and previous page links

  const firstNode = graph[0];
  const lastNode = graph[graph.length - 1];
  const firstKey = firstNode.key;
  const lastKey = lastNode.end || lastNode.key;

  const limit = query?.$key?.$first || query?.$key?.$last || resArr.length || 1;

  if (!isMinKey(firstKey)) {
    Object.defineProperty(resArr, 'prevPage', {
      value: decodeArgs({
        key: keyBefore(firstKey),
        end: prefix(firstKey),
        limit,
      }),
    });
  }

  if (!isMaxKey(lastKey)) {
    Object.defineProperty(resArr, 'nextPage', {
      value: decodeArgs({
        key: keyAfter(lastKey),
        end: prefix(lastKey) + '\uffff',
        limit,
      }),
    });
  }

  // Object.defineProperty(resArr, 'pageInfo', { value: pageInfo(graph) });
  Object.defineProperty(resArr, 'props', { value: object });
  return resArr;
}

export function getRangeNodes(graph, { key, end, limit = Infinity }) {
  const result = [];

  if (key < end) {
    for (let i = findFirst(graph, key); key <= end && limit > 0; i++) {
      const node = graph[i];
      if (!node || key < node.key) break;
      result.push(node);
      if (!isRange(node)) limit--;
      key = keyAfter(node.end || node.key);
    }
  } else {
    for (let i = findLast(graph, key) - 1; key >= end && limit > 0; i--) {
      const node = graph[i];
      if (!node || key > (node.end || node.key)) break;
      result.unshift(node);
      if (!isRange(node)) limit--;
      key = keyBefore(node.key);
    }
  }
  return result;
}
*/
