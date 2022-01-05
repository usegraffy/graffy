const valid = {
  $eq: true,
  $lt: true,
  $gt: true,
  $lte: true,
  $gte: true,
  $re: true,
  $ire: true,
  $text: true,
  $and: true,
  $or: true,
  $any: true,
  $all: true,
  $has: true,
  $cts: true,
  $ctd: true,
};

const inverse = {
  $eq: '$neq',
  $neq: '$eq',
  $in: '$nin',
  $nin: '$in',
  $lt: '$gte',
  $gte: '$lt',
  $gt: '$lte',
  $lte: '$gt',
};

export default function getAst(filter) {
  return simplify(construct(filter));
}

/* construct() might need to give unique aliases to subqueries. We use
   counter to just use consecutive numbers for this.

   Important: The counter is best reset before calling construct() for the
   root filter, but this must not happen during recursive calls. */

function construct(node, prop, op) {
  if (!node || typeof node !== 'object' || (prop && op)) {
    if (op && prop) return [op, prop, node];
    if (prop) return ['$eq', prop, node];
    throw Error('pgast.expected_prop_before:' + JSON.stringify(node));
  }
  if (Array.isArray(node)) {
    return ['$or', node.map((item) => construct(item, prop, op))];
  }
  return [
    '$and',
    Object.entries(node).map(([key, val]) => {
      if (key === '$or' || key === '$and') {
        return [key, construct(val, prop, op)[1]];
      }
      if (key === '$not') {
        return [key, construct(val, prop, op)];
      }

      if (key[0] === '$') {
        if (!valid[key]) throw Error('pgast.invalid_op:' + key);
        if (op) throw Error('pgast.unexpected_op:' + op + ' before:' + key);
        if (!prop) throw Error('pgast.expected_prop_before:' + key);
        return construct(val, prop, key);
      }
      if (prop) {
        if (key[0] === '.') return construct(val, prop + key);
        throw Error('pgast.unexpected_prop: ' + key);
      }
      return construct(val, key);
    }),
  ];
}

function simplify(node) {
  const op = node[0];

  // Recurse into subnodes and simplify them first.
  if (op === '$and' || op === '$or') {
    node[1] = node[1].map((subnode) => simplify(subnode));
  } else if (op === '$not') {
    node[1] = simplify(node[1]);
  }

  // Handle empty $and/$or and booleans
  if (op === '$and') {
    if (!node[1].length) return true;
    if (node[1].includes(false)) return false;
    node[1] = node[1].filter((item) => item !== true);
  } else if (op === '$or') {
    if (!node[1].length) return false;
    if (node[1].includes(true)) return true;
    node[1] = node[1].filter((item) => item !== false);
  } else if (op === '$not' && typeof node[1] === 'boolean') {
    return !node[1];
  }

  // $or with multiple $eq limbs with same prop -> $in
  if (op === '$or') {
    const { eqmap, noneq, change } = node[1].reduce(
      (acc, item) => {
        if (item[0] !== '$eq') {
          acc.noneq.push(item);
        } else if (acc.eqmap[item[1]]) {
          acc.change = true;
          acc.eqmap[item[1]].push(item[2]);
          return acc;
        } else {
          acc.eqmap[item[1]] = [item[2]];
        }
        return acc;
      },
      { eqmap: {}, noneq: [], change: false },
    );

    // Don't return. Modify node and then apply the next rule.
    if (change) {
      node[1] = [
        ...noneq,
        ...Object.entries(eqmap).map(([prop, val]) =>
          val.length > 1 ? ['$in', prop, val] : ['$eq', prop, val[0]],
        ),
      ];
    }
  }

  // unwrap $and / $or with only one limb
  if ((op === '$and' || op === '$or') && node[1].length === 1) {
    return node[1][0];
  }

  // $not $eq -> $neq, $in -> $nin etc.
  if (op === '$not') {
    const [subop, ...subargs] = node[1];
    const invop = inverse[subop];
    return invop ? [invop, ...subargs] : node;
  }

  return node;
}
