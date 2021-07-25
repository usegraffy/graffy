import { decodeGraph } from './decodeTree.js';
import { encode as encodePath, decode as decodePath } from './path.js';
import {
  splitArgs,
  encode as encodeArgs,
  decode as decodeArgs,
} from './args.js';
import { unwrap } from '../ops/index.js';
import { isDef, isPlainObject, isEmpty } from '../util.js';
import { isRange, isBranch, findFirst } from '../node/index.js';

const REF = Symbol();
const PRE = Symbol();

/*
  Approach to decorate (plumGraph, porcQuery):

  Step 1: porcGraph := decodeGraph(plumGraph);
  Step 2: Walk the porcQuery & porcGraph together;
    replace links with references to actual porcGraph nodes.
    extraneous children are OK.

  Step 3: Walk the porcQuery with a path stack;
    copy
*/

export default function decorate(rootGraph, rootQuery) {
  // console.log('Decorating', rootGraph, rootQuery);
  function construct(plumGraph, query) {
    if (!plumGraph) return plumGraph;
    if (query.$key) query = [query];

    // console.log('Constructing', plumGraph[PRE], query);

    let graph;
    if (query.$ref) {
      const { $ref, ...props } = query;
      const path = encodePath($ref);
      graph = construct(getNodeValue(unwrap(rootGraph, path)), props);
      graph.$ref = decodePath(path);
    } else if (Array.isArray(query)) {
      let pageKey;
      graph = query
        .flatMap((item, i) => {
          if (!item?.$key) {
            // This is an integer-indexed array.
            return construct(descend(plumGraph, i), item);
          }

          const { $key, $chi, ...props } = item;
          const subQuery = $chi || (isEmpty(props) ? 1 : props);

          if (!isPlainObject($key) || !splitArgs($key)[0]) {
            // This is a non-string argument without pagination
            return construct(descend(plumGraph, $key), subQuery);
          }

          // This is a pagination query.
          if (pageKey) {
            throw Error(
              'decorate.multi_range_query:' + JSON.stringify({ $key, pageKey }),
            );
          }
          pageKey = $key;
          const children = slice(plumGraph, $key);
          return children
            .filter((node) => !isRange(node))
            .map((node) => {
              const $key = decodeArgs(node);
              const subResult = construct(getNodeValue(node), subQuery);
              if (typeof subResult === 'object') {
                subResult.$key = children[PRE]
                  ? { ...children[PRE], $cursor: $key }
                  : $key;
              }
              return subResult;
            });
        })
        .filter(Boolean);

      addPageMeta(graph, pageKey);
    } else if (typeof query === 'object') {
      graph = {};
      for (const prop in query) {
        const res = construct(descend(plumGraph, prop), query[prop]);
        if (isDef(res)) graph[prop] = res;
      }
    } else if (query) {
      if (Array.isArray(plumGraph)) {
        graph = decodeGraph(plumGraph);
      } else {
        graph = plumGraph;
        if (typeof graph === 'object') graph = { ...graph, $val: true };
      }
    }

    if (plumGraph[REF]) graph.$ref = plumGraph[REF];
    return graph;
  }

  function descend(children, $key) {
    const { key } = encodeArgs($key);
    if (!Array.isArray(children)) return null;
    // console.log('descending', children, $key);
    const ix = findFirst(children, key);
    const node = children[ix];
    if (!node) return;
    if (isRange(node) && node.end >= key) return null;
    if (node.key !== key) return;

    let result;

    if (node.path) {
      // console.log('unwrapping', node.path, rootGraph);
      result = unwrap(rootGraph, node.path);
      result[REF] = node.path;
    } else {
      result = getNodeValue(node);
    }

    if (node.prefix) result[PRE] = $key;
    return result;
  }

  function slice(children, $key) {
    const [range, filter] = splitArgs($key);
    if (isDef(filter)) {
      // console.log('descending into filter', filter, children);
      children = descend(children, filter);
      // console.log('descended into filter', filter, children);}
    } else if (children[0].key === '' && children[0].prefix) {
      // console.log('No-filter descending', children, $key);
      children = descend(children, '');
      // console.log('No-filter descended', children);
    }

    const { key, end, limit = Infinity } = encodeArgs(range);
    const ix = findFirst(children, key);
    let i = ix;
    let result;
    if (key < end) {
      for (let n = 0; i < children.length && n < limit; i++) {
        if (!isRange(children[i])) n++;
      }
      // console.log('slicing fwd', children, ix, i);
      result = children.slice(ix, i);
    } else {
      for (let n = 0; i >= 0 && n < limit; i--) {
        if (!isRange(children[i])) n++;
      }
      // console.log('slicing bkd', children, i + 1, ix + 1);
      result = children.slice(i + 1, ix + 1);
    }

    if (children[REF]) result[REF] = children[REF];
    if (children[PRE]) result[PRE] = children[PRE];
    return result;
  }

  const result = construct(rootGraph, rootQuery, []);
  // console.log('Decorate', result, rootGraph, rootQuery);
  return result;
}

const getNodeValue = (node) => {
  if (isBranch(node)) return node.children;
  return node.value;
};

function addPageMeta(graph, args) {
  if (args.$all) {
    Object.assign(graph, { $key: args, $prev: null, $next: null });
    return;
  }

  const [{ $first, $last, ...bounds }, filter] = splitArgs(args);
  const count = $first || $last;
  const $key = { ...filter, ...bounds, $all: true };

  if (graph.length === count) {
    // This result was limited by the count; update the "outer" bound.
    if ($first) {
      const boundKey = graph[graph.length - 1].$key;
      $key.$until = isDef(boundKey?.$cursor) ? boundKey.$cursor : boundKey;
      delete $key.$before;
    } else {
      const boundKey = graph[0].$key;
      $key.$since = isDef(boundKey?.$cursor) ? boundKey.$cursor : boundKey;
      delete $key.$after;
    }
  }

  // prettier-ignore
  const $prev =
    isDef($key.$after) ? { ...filter, $last: count, $until: $key.$after } :
    isDef($key.$since) ? { ...filter, $last: count, $before: $key.$since } :
    null;

  // prettier-ignore
  let $next =
    isDef($key.$before) ? { ...filter, $first: count, $since: $key.$before } :
    isDef($key.$until) ? { ...filter, $first: count, $after: $key.$until } :
    null;

  Object.assign(graph, { $key, $next, $prev });
}
