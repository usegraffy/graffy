import isEmpty from 'lodash/isEmpty';

import {
  unwrap,
  makeNode,
  isRange,
  splitRange,
  encRange,
  LINK_KEY,
  PAGE_KEY,
  merge,
} from '@graffy/common';

/*
  Given a tree, a query and a visitor callback, the walk function invokes
  the visitor for:
  - each node in the tree that matches the query, with node and path arguments.
  - each non-existent path in the tree that would have matched the query
  - each range key in the query, with the result bounds as the first argument.
*/

function walk(root, rootQuery, visit) {
  function step(node, query, path) {
    if (
      typeof node !== 'object' ||
      typeof query !== 'object' ||
      !node ||
      !query
    ) {
      visit(node, query, path);
      return;
    }

    const link = node[LINK_KEY];
    if (link) {
      visit(node, query, path);
      step(unwrap(root, link), query, link);
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

export function getUnknown(rootQuery, root) {
  const nextQuery = {};

  walk(root, rootQuery, (node, query, path) => {
    if (typeof node === 'undefined') set(nextQuery, path, query);
  });

  return isEmpty(nextQuery) ? undefined : nextQuery;
}

/*
  getKnown (returns only parts of the graph that exist in query)
*/

export function getKnown(rootQuery, root) {
  const pruned = {};

  walk(root, rootQuery, (node, query, path) => {
    if (typeof node === 'undefined') return;

    if (typeof node !== 'object' || !node || node[LINK_KEY] || node[PAGE_KEY]) {
      set(pruned, path, node);
    }
  });

  return isEmpty(pruned) ? undefined : pruned;
}

/* hasKnown (check if query matches any part of graph) */

export function hasKnown(rootQuery, root) {
  // TODO: Make this more efficient.
  return !!getKnown(rootQuery, root);
}

/*
  strike: Copies parts of the query that cross links, repeating them at their
  canonical positions.

  The returned value is used to compute intersections with change objects.
*/

export function linkKnown(rootQuery, root) {
  const normalized = {};

  walk(root, rootQuery, (node, query, path) => {
    if (node && node[PAGE_KEY]) {
      const [after, before] = node[PAGE_KEY];
      set(normalized, path, { [encRange({ after, before })]: query });
      return;
    }

    set(normalized, path, query);
  });

  return isEmpty(normalized) ? undefined : normalized;
}
