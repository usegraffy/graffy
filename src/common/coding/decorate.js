import { decodeGraph } from './decodeTree.js';
import {
  encode as encodePath,
  decode as decodePath,
  splitRef,
} from './path.js';
import {
  splitArgs,
  encode as encodeArgs,
  decode as decodeArgs,
} from './args.js';
import { unwrap, getNodeValue, IS_VAL } from '../ops/index.js';
import {
  isDef,
  isPlainObject,
  isEmpty,
  isMinKey,
  cmp,
  MIN_KEY,
} from '../util.js';
import { isRange, findFirst } from '../node/index.js';

const REF = Symbol();
const PRE = Symbol();

export default function decorate(rootGraph, rootQuery) {
  // console.log('Decorating', rootGraph, rootQuery);
  function construct(plumGraph, query) {
    if (plumGraph === null) return null;
    if (!isDef(plumGraph)) plumGraph = [];
    if (query.$key) query = [query];

    // console.log('Constructing', plumGraph, query);

    let graph;
    if (query.$ref) {
      const { $ref, ...props } = query;
      const [range, filter] = splitRef($ref);
      const path = encodePath($ref);
      const targetPlumGraph = unwrap(rootGraph, path);
      if (targetPlumGraph) {
        if (range) targetPlumGraph[PRE] = filter;
        graph = construct(
          targetPlumGraph,
          range ? { $key: range, ...props } : props,
        );
        Object.defineProperty(graph, '$ref', { value: $ref });
      }
    } else if (Array.isArray(query)) {
      let pageKey;
      graph = query.flatMap((item, i) => {
        if (!item?.$key) {
          // This is an integer-indexed array.
          return construct(descend(plumGraph, i), item);
        }

        const { $key, $chi, ...props } = item;
        const subQuery = $chi || (isEmpty(props) ? 1 : props);

        if (!(isPlainObject($key) && splitArgs($key)[0])) {
          // This is a non-string argument without pagination
          return construct(descend(plumGraph, $key), subQuery);
        }

        // This is a pagination query.
        if (pageKey) {
          throw Error(
            `decorate.multi_range_query:${JSON.stringify({ $key, pageKey })}`,
          );
        }
        pageKey = $key;
        const children = slice(plumGraph, $key);
        return children
          .filter((node) => !isRange(node))
          .map((node) => {
            const $key = decodeArgs(node);
            const subResult = construct(getValue(node), subQuery);
            if (typeof subResult === 'object') {
              subResult.$key =
                children[PRE] && !isMinKey(children[PRE])
                  ? { ...children[PRE], $cursor: $key }
                  : $key;
            }
            return subResult;
          });
      });
      // .filter(Boolean);

      if (pageKey) addPageMeta(graph, pageKey);
    } else if (typeof query === 'object') {
      graph = {};
      for (const prop in query) {
        graph[prop] = construct(descend(plumGraph, prop), query[prop]);
      }
    } else if (query) {
      if (Array.isArray(plumGraph) && !plumGraph.length) {
        graph = undefined;
      } else if (typeof plumGraph !== 'object' || !plumGraph) {
        graph = plumGraph;
      } else if (plumGraph[IS_VAL]) {
        graph = Array.isArray(plumGraph)
          ? plumGraph.slice(0)
          : { ...plumGraph };
        graph.$val = true;
      } else if (Array.isArray(plumGraph)) {
        graph = decodeGraph(plumGraph);
      } else {
        throw Error('decorate.unexpected_graph');
      }
    }

    if (plumGraph[REF]) {
      Object.defineProperty(graph, '$ref', {
        value: decodePath(plumGraph[REF]),
      });
    }
    return graph;
  }

  function descend(children, $key) {
    const key = ArrayBuffer.isView($key) ? $key : encodeArgs($key).key;
    if (!Array.isArray(children)) return null;
    const ix = findFirst(children, key);
    const node = children[ix];
    if (!node) return;
    if (isRange(node) && node.end >= key) return null;
    if (cmp(node.key, key) !== 0) return;

    const result = getValue(node);
    if (node.prefix) result[PRE] = $key;
    return result;
  }

  function getValue(node) {
    let result;

    if (node.path) {
      result = unwrap(rootGraph, node.path);
      if (typeof result === 'object') result[REF] = node.path;
    } else {
      result = getNodeValue(node);
    }

    return result;
  }

  function slice(children, $key) {
    const [range, filter] = splitArgs($key);
    if (isDef(filter)) {
      children = descend(children, filter);
    } else if (isMinKey(children[0].key) && children[0].prefix) {
      children = descend(children, MIN_KEY);
    }

    const { key, end, limit = Infinity } = encodeArgs(range);
    const ix = findFirst(children, key);
    let i = ix;
    let result;
    if (cmp(key, end) < 0) {
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

  const result = construct(rootGraph, rootQuery);
  // console.log('Decorate', result, rootGraph, rootQuery);
  return result;
}

function addPageMeta(graph, args) {
  if (args.$all) {
    Object.assign(graph, { $page: args, $prev: null, $next: null });
    return;
  }

  const [{ $first, $last, ...bounds }, filter] = splitArgs(args);
  const count = $first || $last;
  /** @type {any} */
  const $page = { ...filter, ...bounds, $all: true };

  if (graph.length === count) {
    // This result was limited by the count; update the "outer" bound.
    if ($first) {
      const boundKey = graph[graph.length - 1].$key;
      $page.$until = isDef(boundKey?.$cursor) ? boundKey.$cursor : boundKey;
      delete $page.$before;
    } else {
      const boundKey = graph[0].$key;
      $page.$since = isDef(boundKey?.$cursor) ? boundKey.$cursor : boundKey;
      delete $page.$after;
    }
  }

  // prettier-ignore
  const $prev =
    isDef($page.$after) ? { ...filter, $last: count, $until: $page.$after } :
    isDef($page.$since) ? { ...filter, $last: count, $before: $page.$since } :
    null;

  // prettier-ignore
  let $next =
    isDef($page.$before) ? { ...filter, $first: count, $since: $page.$before } :
    isDef($page.$until) ? { ...filter, $first: count, $after: $page.$until } :
    null;

  Object.assign(graph, { $page, $next, $prev });
}
