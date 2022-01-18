import {
  add,
  wrapValue,
  isBranch,
  findFirst,
  splitRef,
  decodeArgs,
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
    const [key, ...rest] = path;
    if (rest.length === 0) {
      const ix = findFirst(query, key);
      if (query[ix]?.key !== key) return []; // Not using this def

      // Remove the request for the link itself.
      const [{ children: subQuery }] = query.splice(ix, 1);

      // Request the data we will need later to construct the link.
      add(rootQuery, getDefQuery(def, vars, version));

      const [range, filter] = splitRef(def);

      if (range && subQuery.length) {
        return subQuery.map((node) => {
          // console.log('Creating def', decodeArgs(node), path, def);
          // if (end || !prefix) {
          //   throw Error('unexpected' + key + ' ' + end + ' ' + prefix);
          // }

          return {
            path: path.concat(node.key),
            def: prepareDef(
              def
                .slice(0, -1)
                .concat({ ...filter, ...decodeArgs(node), ...range }),
              vars,
            ),
          };
        });
      } else {
        return [{ path, def: prepareDef(def, vars) }];
      }
    }

    function prefixKey(defs, key) {
      return defs.map(({ path, def }) => ({
        path: [key, ...path],
        def,
      }));
    }

    let used = [];
    if (key[0] !== '$') {
      const node = query[findFirst(query, key)];
      if (!node || node.key !== key || !node.children) return [];
      used = prepQueryDef(node.children, rest, def, vars, node.version);
      used = prefixKey(used, node.key);
    } else {
      for (const node of query) {
        if (!isBranch(node)) continue;
        let usedHere;
        if (node.prefix) {
          const pageToString = () => key;
          usedHere = node.children.flatMap((subNode) => {
            // We want the full decoded arg (with end, limit) for getting
            // the defQuery, but we want only the key in prepareDef. As
            // prepareDef assumes var values to be strings, we can use
            // the toString function to hack this.
            const pager = decodeArgs(subNode);
            Object.defineProperty(pager, 'toString', { value: pageToString });

            return prefixKey(
              prepQueryDef(
                subNode.children,
                rest,
                def,
                { ...vars, [key.slice(1)]: [node.key, pager] },
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
            { ...vars, [key.slice(1)]: node.key },
            node.version,
          );
        }
        usedHere = prefixKey(usedHere, node.key);
        used = used.concat(usedHere);
      }
    }
    return used;
  }
}

function getDefQuery(def, vars, version) {
  function getValue(key) {
    return key[0] === '$' ? vars[key.slice(1)] : key;
  }

  function getPath(template) {
    return template.split('.').flatMap(getValue);
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
      for (const prop in key) addDefQueries(key[prop]);
    }
  }

  def.map(addDefQueries);
  return defQuery;
}

function prepareDef(def, vars) {
  function getValue(key) {
    return key[0] === '$' ? vars[key.slice(1)] : key;
  }

  function replacePlaceholders(key) {
    if (typeof key === 'string' && key[0] === '$' && key[1] === '$') {
      return '$$' + key.slice(2).split('.').flatMap(getValue).join('.');
    }
    if (Array.isArray(key)) {
      return key.flatMap(replacePlaceholders);
    }
    if (typeof key === 'object' && key) {
      const result = {};
      for (const prop in key) result[prop] = replacePlaceholders(key[prop]);
      return result;
    }
    return getValue(key);
  }
  return def.flatMap(replacePlaceholders);
}
