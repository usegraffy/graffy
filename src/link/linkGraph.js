import { merge, unwrap, findFirst, encodePath, splitRef } from '@graffy/common';

/* Adds links to a graph, using the provided link definitions.
   Modifies the graph in-place. */
export default function linkGraph(rootGraph, defs) {
  for (const { path, def } of defs) linkGraphDef(rootGraph, path, def);
  // console.log('linked', rootGraph);
  return rootGraph;

  function findChildren(node) {
    if (node.children) return node.children;
    if (node.path) {
      const linkedNode = unwrap(rootGraph, node.path);
      if (Array.isArray(linkedNode)) return linkedNode;
    }
    throw Error('link.no_children ' + JSON.stringify(node));
  }

  // TODO: Write a linkGraphDef that traverses using *def*, then makes
  // refs at the corresponding path.

  function linkGraphDef(graph, path, def, vars = {}, version = 0) {
    const [key, ...rest] = path;

    console.log('lGD', { key });

    function addRef(k) {
      const ref = makeRef(def, vars);
      const [range] = splitRef(def);
      const node = { key: k, path: encodePath(ref), version };
      if (range) node.prefix = true;
      merge(graph, [node]);
      return;
    }

    if (rest.length === 0) {
      if (key[0] === '$') {
        for (const node of graph) {
          if (node.end) continue;
          console.log('Linking', key, node.key);
          vars[key.slice(1)] = node.key;
          addRef(node.key);
        }
      } else {
        addRef(key);
      }
    }

    if (key[0] === '$') {
      for (const node of graph) {
        if (node.end) continue;
        const newVars = { ...vars, [key.slice(1)]: node.key };
        linkGraphDef(findChildren(node), rest, def, newVars, node.version);
      }
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
    return linkGraphDef(findChildren(node), rest, def, vars, node.version);
  }

  // If you find yourself editing this function, you probably want
  // to edit prepareDef in prepQueryLinks too.
  function makeRef(def, vars) {
    function getValue(key) {
      if (typeof key !== 'string') return key;
      return key[0] === '$' ? vars[key.slice(1)] : key;
    }

    function replacePlaceholders(key) {
      if (typeof key === 'string' && key[0] === '$' && key[1] === '$') {
        return unwrap(rootGraph, key.slice(2).split('.').map(getValue));
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
