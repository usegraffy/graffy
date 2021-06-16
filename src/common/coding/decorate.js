import { decodeGraph } from './decodeTree.js';
import { encode as encodePath } from './path.js';
import { splitArgs } from './args.js';
import { unwrap } from '../ops/index.js';
import { unwrapObject } from '../object.js';
import { isPlainObject, isDef } from '../util.js';

export default function decorate(rootGraph, rootQuery) {
  // function construct(query, path) {
  //   if (query.$key) query = [query];
  //
  //   let graph;
  //   if (Array.isArray(query)) {
  //     graph = query.flatMap((item, i) => {
  //       if (!item?.$key) {
  //         // This is an integer-indexed array.
  //         return construct(item, path.concat([i]));
  //       }
  //       const { $key, $ver, $chi, ...props } = item;
  //       if (!isPlainObject($key) || !splitArgs($key)[0]) {
  //         // This is a non-string argument without pagination
  //         return construct($chi || props, path.concat([$key]));
  //       }
  //     });
  //   } else if (typeof query === 'object') {
  //     graph = {};
  //     for (const prop in query) {
  //       graph[prop] = construct(query[prop], path.concat([prop]));
  //     }
  //   } else if (query) {
  //     return decodeGraph(unwrap(rootGraph, encodePath(path)));
  //   }
  //   return graph;
  // }
  //
  // const result = construct(rootQuery, []);
  //
  // return result;

  const root = decodeGraph(rootGraph);

  console.log('decorate', rootGraph, root, rootQuery);

  function makeResult(graph, query) {
    if (graph?.$ref && typeof query === 'object') {
      // This is a link. Jump there.
      const newObject = makeResult(unwrapObject(root, graph.$ref), query);
      newObject.$ref = graph.$ref;
      return newObject;
    }

    if (Array.isArray(query)) {
      return query.flatMap((subQuery) => makeObjectResult(graph, subQuery));
    } else if (typeof query === 'object' && query) {
      return makeObjectResult(graph, query);
    } else {
      return graph;
    }
  }

  function makeObjectResult(graph, query) {
    console.log('makeObjectResult', graph, query);

    if (query.$key) {
      const { $key, $ver, $chi, ...queryProps } = query;
      const isPlainKey = isPlainObject($key);
      const [page, filter] = isPlainKey ? splitArgs($key) : [];

      if (!isPlainKey || !page) {
        // Lookup a single child from the graph.
        const child = getGraphChild(graph, $key);
        return $chi
          ? { $key, $chi: makeResult(child, $chi) }
          : { $key, ...makeResult(child, queryProps) };
      } else {
        // Lookup a page of children from the graph.
        const children = getGraphChildren(graph, page, filter);
        children.$key = $key;
        children.$next = children.$prev = { stub: true };
        return children;
      }
    }

    const newObject = {};
    for (const prop in query) {
      if (!isDef(graph[prop])) continue;
      newObject[prop] = makeResult(getGraphChild(graph, prop), query[prop]);
    }
    return newObject;
  }

  function getGraphChild(graph, key) {
    if (isPlainObject(graph)) return graph[key];
    throw Error('search_graphs_unimplemented');
  }

  function getGraphChildren(graph, page, filter) {
    throw Error('search_graphs_unimplemented');
  }

  const res = makeResult(root, rootQuery);
  console.log('res', res);
  return res;
}
