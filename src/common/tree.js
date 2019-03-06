import isEmpty from 'lodash/isEmpty';

import { getNode, makeNode } from './path';
import { isRange, splitRange } from './range';
import { LINK_KEY, PAGE_KEY } from './constants';
import merge from './merge';

/*
  Given a tree, a query and a visitor callback, the walk function invokes
  the visitor for:
  - each node in the tree that matches the query, with node and path arguments.
  - each non-existent path in the tree that would have matched the query
  - each range key in the query, with the result bounds as the first argument.
*/

function walk(root, rootQuery, visit) {
  function step(node, query, path) {
    visit(node, query, path);

    if (
      typeof node !== 'object' ||
      typeof query !== 'object' ||
      !node ||
      !query
    ) {
      return;
    }

    const link = node[LINK_KEY];
    if (link) {
      step(getNode(root, link), query, link);
      return;
    }

    for (const key in query) {
      const subQuery = query[key];
      if (!isRange(key)) {
        step(node[key], subQuery, path.concat(key));
        continue;
      }

      const { keys, known, unknown } = splitRange(node, key);
      keys.forEach(k => step(node[k], subQuery, path.concat(k)));
      if (unknown) step(undefined, subQuery, path.concat(unknown));
      if (known) visit({ [PAGE_KEY]: known }, subQuery, path);
    }
  }

  step(root, rootQuery, []);
}

function set(object, path, value) {
  const key = path[path.length - 1];
  const node = makeNode(object, path.slice(0, -1));
  if (typeof value !== 'object' || !value) {
    node[key] = value;
    return;
  }

  if (typeof node[key] !== 'object' || !node[key]) node[key] = {};
  merge(node[key], value);
}

/*
  Sprout (new branches)
  Given a cached tree and a query, return a new query representing parts of the
  input query that are not present in the tree.
*/

export function sprout(root, rootQuery) {
  const nextQuery = {};

  walk(root, rootQuery, (node, query, path) => {
    if (typeof node === 'undefined') set(nextQuery, path, query);
  });

  return isEmpty(nextQuery) ? undefined : nextQuery;
}

/*
  Prune (unnecessary branches)
*/

export function prune(root, rootQuery) {
  const pruned = {};

  walk(root, rootQuery, (node, query, path) => {
    if (typeof node === 'undefined') return;

    if (typeof node !== 'object' || !node || node[LINK_KEY] || node[PAGE_KEY]) {
      set(pruned, path, node);
    }
  });

  return isEmpty(pruned) ? undefined : pruned;
}

/*
  Plant: Cuts the query at link crossings and rejoins the subqueries at their
  canonical positions.
*/

export function plant(root, rootQuery) {
  const normalized = {};

  walk(root, rootQuery, (node, query, path) => {
    if (typeof node === 'undefined') return;
    if (typeof node !== 'object' || !node) set(normalized, path, query);
    if (node[LINK_KEY]) set(normalized, path, true);
  });

  return isEmpty(normalized) ? undefined : normalized;
}

// Convert a raw response into a denormalized and easy-to-consume graph.
export function graft(tree, root) {
  if (typeof tree !== 'object' || !tree) return tree;

  if (!root) root = tree;

  let empty = true;
  let result = {};

  if (tree[LINK_KEY]) {
    return graft(getNode(root, tree[LINK_KEY]), root);
  }

  if (tree[PAGE_KEY]) {
    Object.defineProperty(result, PAGE_KEY, { value: PAGE_KEY });
    empty = false;
  }

  for (const key in tree) {
    const branch = graft(tree[key], root);
    if (typeof branch === 'undefined') {
      delete tree[key];
    } else {
      result[key] = branch;
      empty = false;
    }
  }

  return empty ? undefined : result;
}
