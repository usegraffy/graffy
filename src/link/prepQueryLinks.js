import {
  MIN_KEY,
  add,
  cmp,
  decodeArgs,
  encodeArgs,
  encodeQuery,
  findFirst,
  isBranch,
  splitRef,
} from '@graffy/common';

/*
  Given a query and an array of link definitions, it:
  - modifies the query in-place to remove the link properties
    and add data properties required to construct the link.
  - returns an array of link definitions used in this query,
    along with the subQueries for each.
  - as far as possible, placeholders in the returned defs are
    replaced with actual keys from the query. In cases where
    the keys are not known before the query is evaluated 
    (i.e. pagination), placeholders are preserved to be
    replaced in the linkGraph function.
*/

export default function prepQueryLinks(rootQuery, defs) {
  return defs.flatMap(({ path, def }) => prepQueryDef(rootQuery, path, def));

  function prepQueryDef(query, path, def, vars = {}, version = 0) {
    function addDefQuery(subQuery) {
      // Request the data we will need later to construct the link.
      add(rootQuery, getDefQuery(def, vars, version));

      // Return the "used defs" for use by linkGraph
      const [range, filter] = splitRef(def);
      if (range && subQuery.length) {
        return subQuery.map((node) => {
          if (!(node.prefix || node.end)) {
            throw Error(
              `link.range_expected: ${path.concat(node.key).join('.')}`,
            );
          }
          return {
            // Range queries that don't specify prefix:true are those
            // without filters; we expect that the result will contain
            // a prefix node with MIN_KEY to indicate this, so we add
            // MIN_KEY here to match that.
            path: path.concat(node.prefix ? decodeArgs(node) : MIN_KEY),
            def: prepareDef(
              def.slice(0, -1).concat({
                ...filter,
                ...(node.prefix ? decodeArgs(node) : {}),
                ...range,
              }),
              vars,
            ),
          };
        });
      }
      return [{ path, def: prepareDef(def, vars) }];
    }

    function prefixKey(defs, key) {
      return defs.map(({ path, def }) => ({
        path: [key, ...path],
        def,
      }));
    }

    if (!(Array.isArray(query) && query.length)) return [];

    const [key, ...rest] = path;
    const encodedKey = encodeArgs(key).key;
    if (rest.length === 0) {
      if (key[0] === '$') {
        return query.splice(0).flatMap((node) => {
          vars[key.slice(1)] = decodeArgs(node);
          return addDefQuery(node.children);
        });
      }
      const ix = findFirst(query, encodedKey);
      if (!query[ix] || cmp(query[ix].key, encodedKey) !== 0) return []; // Not using this def
      // Remove the request for the link itself.
      const [{ children: subQuery }] = query.splice(ix, 1);
      return addDefQuery(subQuery);
    }

    let used = [];
    if (key[0] === '$') {
      for (const node of query) {
        if (!isBranch(node)) continue;
        let usedHere;
        if (node.prefix) {
          usedHere = node.children.flatMap((subNode) => {
            return prefixKey(
              prepQueryDef(
                subNode.children,
                rest,
                def,
                {
                  ...vars,
                  [key.slice(1)]: {
                    ...decodeArgs(node),
                    ...decodeArgs(subNode),
                  },
                },
                node.version,
              ),
              key,
            );
          });
        } else {
          usedHere = prepQueryDef(
            node.children,
            rest,
            def,
            { ...vars, [key.slice(1)]: decodeArgs(node) },
            node.version,
          );
        }
        if (!node.prefix) usedHere = prefixKey(usedHere, decodeArgs(node));
        used = used.concat(usedHere);
      }
    } else {
      const node = query[findFirst(query, encodedKey)];
      if (!node || cmp(node.key, encodedKey) !== 0 || !node.children) return [];
      used = prepQueryDef(node.children, rest, def, vars, node.version);
      if (!node.prefix) used = prefixKey(used, decodeArgs(node));
    }

    // Remove any childnodes whose children are now empty.
    for (let i = 0; i < query.length; i++) {
      if (query[i].children && query[i].children.length === 0) {
        query.splice(i, 1);
        i--;
      }
    }
    // console.log('Used def', used);
    return used;
  }
}

function getDefQuery(def, vars, version) {
  // console.log('getDefQuery', def, vars);
  function getValue(key) {
    return key[0] === '$' ? vars[key.slice(1)] : key;
  }

  function getPath(template) {
    return template.split('.').flatMap(getValue);
  }

  const defQuery = [];
  function addDefQueries(key) {
    if (typeof key === 'string' && key[0] === '$' && key[1] === '$') {
      const path = getPath(key.slice(2));
      // We do this to ensure that range queries are made correctly.
      let porcelainQuery = { $key: path.pop() };
      let $key;
      while (($key = path.pop())) {
        porcelainQuery = { $key, $chi: [porcelainQuery] };
      }
      const query = encodeQuery(porcelainQuery, version);
      add(defQuery, query);
    }
    if (Array.isArray(key)) {
      key.map(addDefQueries);
    }
    if (typeof key === 'object' && key) {
      for (const prop in key) {
        addDefQueries(prop);
        addDefQueries(key[prop]);
      }
    }
  }

  def.map(addDefQueries);
  return defQuery;
}

// If you find yourself editing this function, you probably want
// to edit makeRef in linkGraph too.
function prepareDef(def, vars) {
  function getValue(key) {
    if (typeof key !== 'string') return key;
    if (key[0] === '$' && key.slice(1) in vars) {
      const value = vars[key.slice(1)];
      return typeof value === 'object' && value !== null ? key : value;
    }
    return key;
  }

  function replacePlaceholders(key) {
    if (typeof key === 'string' && key[0] === '$' && key[1] === '$') {
      return `$$${key.slice(2).split('.').flatMap(getValue).join('.')}`;
    }
    if (Array.isArray(key)) {
      return key.map(replacePlaceholders);
    }
    if (typeof key === 'object' && key) {
      const result = {};
      for (const prop in key) {
        result[replacePlaceholders(prop)] = replacePlaceholders(key[prop]);
      }
      return result;
    }
    return getValue(key);
  }
  const ref = def.map(replacePlaceholders);
  return ref;
}
