import { merge, unwrap, isBranch, findFirst, encodePath } from '@graffy/common';

/* Adds links to a graph, using the provided link definitions.
   Modifies the graph in-place. */
export default function linkGraph(rootGraph, defs) {
  for (const { path, def } of defs) linkGraphDef(rootGraph, path, def);
  return rootGraph;

  function linkGraphDef(graph, path, def, vars = {}, version = 0) {
    const [key, ...rest] = path;
    if (rest.length === 0) {
      merge(graph, [{ key, path: encodePath(makeRef(def, vars)), version }]);
      return;
    }

    if (key[0] !== '$') {
      const node = graph[findFirst(graph, key)];
      if (!node || node.key !== key || !node.children) {
        throw Error('linkGraph.no_path ' + key);
      }
      linkGraphDef(node.children, rest, def, vars, node.version);
    } else {
      for (const node of graph) {
        if (!isBranch(node)) continue;
        linkGraphDef(
          node.children,
          rest,
          def,
          {
            ...vars,
            [key.slice(1)]: node.key,
          },
          node.version,
        );
      }
    }
  }

  function makeRef(def, vars) {
    function getValue(key) {
      return key[0] === '$' ? vars[key.slice(1)] : key;
    }

    function getPath(template) {
      return template.split('.').map(getValue);
    }

    function replacePlaceholders(key) {
      if (typeof key === 'string' && key[0] === '$' && key[1] === '$') {
        return unwrap(rootGraph, getPath(key.slice(2)));
      }
      if (Array.isArray(key)) {
        return key.map(replacePlaceholders);
      }
      if (typeof key === 'object' && key) {
        const result = {};
        for (const prop in key) result[prop] = replacePlaceholders(key[prop]);
        return result;
      }
      return getValue(key);
    }

    const ref = def.map(replacePlaceholders);
    return ref;
  }
}

// lookup: $$;
// substitute: $;
