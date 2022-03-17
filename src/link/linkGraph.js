import {
  merge,
  wrap,
  unwrap,
  findFirst,
  encodePath,
  splitRef,
  splitArgs,
} from '@graffy/common';

export default function linkGraph(rootGraph, defs) {
  let version = rootGraph[0].version;

  for (const { path, def } of defs) {
    /** @type {{
        value: any,
        vars: Record<string, any>,
        reqs: Record<string, true>,
      }[][]} */
    const braid = def.map(getChoices);
    const strands = unbraid(braid);

    const pathReqs = path
      .filter((key) => key[0] === '$')
      .reduce((acc, key) => {
        acc[key.slice(1)] = true;
        return acc;
      }, {});

    outer: for (const { value, vars, reqs } of strands) {
      for (const req in reqs) if (!(req in vars)) continue outer;
      for (const req in pathReqs) if (!(req in vars)) continue outer;

      const realPath = makeRef(path, vars);
      const realRef = makeRef(value, vars);
      const node = { key: realPath.pop(), path: encodePath(realRef), version };

      const [range] = splitRef(realRef);
      if (range) node.prefix = true;

      let target = rootGraph;
      do {
        const key = realPath.shift();
        const nextTarget = target[findFirst(target, key)];
        if (!nextTarget || nextTarget.key !== key || nextTarget.end) {
          realPath.unshift(key);
          break;
        }
        target = nextTarget.path
          ? unwrap(rootGraph, nextTarget.path)
          : nextTarget.children;
      } while (target && realPath.length);

      if (!target) return;
      merge(target, realPath.length ? wrap([node], realPath, version) : [node]);
    }
  }

  return rootGraph;

  function getChoices(key) {
    if (typeof key === 'string' && key[0] === '$' && key[1] === '$') {
      return lookupValues(rootGraph, key.slice(2).split('.'));
    }
    if (Array.isArray(key)) {
      return unbraid(key.map(getChoices));
    }
    if (typeof key === 'object' && key) {
      const [range = {}, filter] = splitArgs(key);
      const entries = unbraid(Object.entries(filter).flat().map(getChoices));

      return entries.map(({ value, vars, reqs }) => ({
        value: {
          ...range,
          ...Object.fromEntries(
            value.reduce((acc, item, i) => {
              if (i % 2) {
                acc[acc.length - 1].push(item);
              } else {
                acc.push([item]);
              }
              return acc;
            }, []),
          ),
        },
        vars,
        reqs,
      }));
    }
    if (typeof key === 'string' && key[0] === '$') {
      return [{ value: key, vars: {}, reqs: { [key.slice(1)]: true } }];
    }
    return [{ value: key, vars: {}, reqs: {} }];
  }

  /**
    Takes a lookup expression which may optionally contain named placeholders,
    and returns an array of possible values in the graph that it matches.
    For each such value, it also returns the corresponding placeholder values.
    @param {string[]} path
    @return {{ value: any, vars: Record<string,any> }[]}
  */
  function lookupValues(graph, path, vars = {}) {
    const [key, ...rest] = path;

    if (key[0] === '$') {
      return graph.flatMap((node) => {
        if (node.end) return [];
        const newVars = { ...vars, [key.slice(1)]: node.key };
        return recurse(node, rest, newVars);
      });
    }

    let node = graph[findFirst(graph, key)];
    if (!node || node.key !== key || node.end) return [];
    return recurse(node, rest, vars);
  }

  function recurse(node, path, vars) {
    if (!path.length) return [{ value: node.value, vars, reqs: {} }];
    if (node.children) return lookupValues(node.children, path, vars);
    if (node.path) {
      const linked = unwrap(rootGraph, node.path);
      if (Array.isArray(linked)) return lookupValues(linked, path, vars);
    }
    throw Error('link.no_children ' + JSON.stringify(node));
  }
}

function unbraid(braid) {
  if (!braid.length) return [];
  const [options, ...rest] = braid;
  if (!rest.length) {
    return options.map((option) => ({
      value: [option.value],
      vars: option.vars,
      reqs: option.reqs,
    }));
  }

  const strands = unbraid(rest);
  return options.flatMap((option) =>
    strands
      .filter((strand) => isCompatible(option.vars, strand.vars))
      .map((strand) => ({
        value: [option.value, ...strand.value],
        vars: { ...option.vars, ...strand.vars },
        reqs: { ...option.reqs, ...strand.reqs },
      })),
  );
}

function isCompatible(oVars, sVars) {
  for (const name in oVars) {
    if (name in sVars && oVars[name] !== sVars[name]) return false;
  }
  return true;
}

// If you find yourself editing this function, you probably want
// to edit prepareDef in prepQueryLinks too.
function makeRef(def, vars) {
  function getValue(key) {
    if (typeof key !== 'string') return key;
    return key[0] === '$' && key.slice(1) in vars ? vars[key.slice(1)] : key;
  }

  function replacePlaceholders(key) {
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
