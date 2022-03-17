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

  /*
    Braids and Strands are different representations of the set of paths
    you obtain by replacing placeholders in the path.

    This is better explained using an example.

    Say we have a blogging application. Posts have multiple authors identified by
    authorId, and a single post category. Authors have different "taglines" for each
    category. We want to add a link "tagline" from the post to the relevant author
    tagline.
    
    We use the link definition:
    'post.$i.authors.$j.tagline': [
      'user',
      '$$post.$i.authors.$j.id',
      'taglines',
      '$$post.$i.category
    ]

    By traversing the graph, we get all possible values of ($i, $j); say
    they are (p0, 0), (p1, 0), (p1, 1).

    We can replace the placeholders with these values to get the "braid":
    [
      [{ value: 'user', vars: {} }],
      [
        { value: u0, vars: {i: p0, j: 0} },
        { value: u1, vars: {i: p1, j: 0} },
        { value: u2, vars: {i: p1, j: 1} },
      ],
      [{ value: 'taglines', vars: {} }],
      [
        { value: 'cooking', vars: {i: p0} },
        { value: 'fitness', vars: {i: p1} },
      ]
    ]

    We then "unbraid" the "braid" into an array of "strands":

    [
      { value: ['user', u0, 'taglines', 'cooking'], vars: {p0, 0} },
      { value: ['user', u1, 'taglines', 'fitness'], vars: {p1, 0} },
      { value: ['user', u2, 'taglines', 'fitness'], vars: {p1, 1} },
    ]

    Note that combinations with incompatible vars such as are removed during
    the unbraid operation (e.g. ['user', u0, 'taglines', 'fitness'])
  */

  for (const { path, def } of defs) {
    /** @type {{ value: any, vars: Record<string, any> }[][]} */
    const braid = def.map(getChoices);
    const strands = unbraid(braid);

    for (const { value, vars } of strands) {
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
      if (!key.length) return [{ value: [], vars: {} }];
      return unbraid(key.map(getChoices));
    }
    if (typeof key === 'object' && key) {
      const [range = {}, filter = {}] = splitArgs(key);
      const entries = Object.entries(filter).flat();
      if (!entries.length) return [{ value: {}, vars: {} }];
      const strands = unbraid(entries.map(getChoices));

      return strands.map(({ value, vars }) => ({
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
      }));
    }
    return [{ value: key, vars: {} }];
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
    if (!path.length) return [{ value: node.value, vars }];
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
    }));
  }

  const strands = unbraid(rest);
  return options.flatMap((option) =>
    strands
      .filter((strand) => isCompatible(option.vars, strand.vars))
      .map((strand) => ({
        value: [option.value, ...strand.value],
        vars: { ...option.vars, ...strand.vars },
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
