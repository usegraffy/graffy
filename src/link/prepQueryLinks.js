import { add, wrapValue, isBranch, findFirst } from '@graffy/common';

/*
  Given a query and an array of link definitions, it:
  - modifies the query in-place to remove the link properties
    and add data properties required to construct the link.
  - returns an array of link definitions used in this query,
    along with the subQueries for each.
*/

export default function prepQueryLinks(rootQuery, defs) {
  return defs.filter(({ path, def }) => prepQueryDef(rootQuery, path, def));

  function prepQueryDef(query, path, def, vars = {}, version = 0) {
    const [key, ...rest] = path;
    if (rest.length === 0) {
      const ix = findFirst(query, key);
      if (query[ix]?.key !== key) return false; // Not using this def

      // Remove the request for the link itself.
      query.splice(ix, 1);

      // Request the data we will need later to construct the link.
      add(rootQuery, getDefQuery(def, vars, version));
      return true; // Using this def
    }

    if (key[0] !== '$') {
      const node = query[findFirst(query, key)];
      if (!node || node.key !== key || !node.children) return;
      return prepQueryDef(node.children, rest, def, vars, node.version);
    } else {
      let used = false;
      for (const node of query) {
        if (!isBranch(node)) continue;
        let usedHere = prepQueryDef(
          node.children,
          rest,
          def,
          {
            ...vars,
            [key.slice(1)]: node.key,
          },
          node.version,
        );

        // Important: do not merge this with the previous line like:
        // ```used = used || prepQueryDef(...)```
        // `prepQueryDef` has side-effects (modifies the query), and
        // the second argument after the `||` operator won't be
        // called for any branch after `used` becomes true.
        used = used || usedHere;
      }
      return used;
    }
  }
}

function getDefQuery(def, vars, version) {
  function getValue(key) {
    return key[0] === '$' ? vars[key.slice(1)] : key;
  }

  function getPath(template) {
    return template.split('.').map(getValue);
  }

  const defQuery = [];
  function addDefQueries(key) {
    if (typeof key === 'string' && key[0] === '$' && key[1] === '$') {
      add(defQuery, wrapValue(1, getPath(key.slice(2)), version));
    }
    if (Array.isArray(key)) {
      key.map(addDefQueries);
    }
    if (typeof key === 'object' && key) {
      const result = {};
      for (const prop in key) result[prop] = addDefQueries(key[prop]);
    }
  }

  def.map(addDefQueries);
  return defQuery;
}
