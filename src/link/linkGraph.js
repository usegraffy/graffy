import { merge, unwrap, findFirst, encodePath, splitRef } from '@graffy/common';

/* Adds links to a graph, using the provided link definitions.
   Modifies the graph in-place. */
export default function linkGraph(rootGraph, defs) {
  for (const { path, def } of defs) linkGraphDef(rootGraph, path, def);
  return rootGraph;

  function linkGraphDef(graph, path, def, version = 0) {
    const [key, ...rest] = path;
    if (rest.length === 0) {
      const ref = makeRef(def);
      const [range] = splitRef(def);
      const node = { key, path: encodePath(ref), version };
      if (range) node.prefix = true;
      merge(graph, [node]);
      return;
    }

    let node = graph[findFirst(graph, key)];

    if (!node || node.key !== key || node.end) {
      // We want to add a branch node with no children (yet).
      // Unfortunately merge does not like this, and we have
      // to work around it by inserting a leaf node and then
      // converting it to a branch.
      node = { key, version, value: 1 };
      merge(graph, [node]);
      delete node.value;
      node.children = [];
    }

    if (!node.children) {
      throw Error('linkGraph.unexpected_leaf ' + key);
    }
    linkGraphDef(node.children, rest, def, node.version);
  }

  function makeRef(def) {
    function replacePlaceholders(key) {
      if (typeof key === 'string' && key[0] === '$' && key[1] === '$') {
        return unwrap(rootGraph, key.slice(2).split('.'));
      }
      if (Array.isArray(key)) {
        return key.map(replacePlaceholders);
      }
      if (typeof key === 'object' && key) {
        const result = {};
        for (const prop in key) result[prop] = replacePlaceholders(key[prop]);
        return result;
      }
      return key;
    }

    const ref = def.map(replacePlaceholders);
    return ref;
  }
}
