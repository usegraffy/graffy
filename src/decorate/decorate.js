import { isRange, isBranch, isLink } from '@graffy/struct';

const LINK_PLACEHOLDER = Symbol();

export function unwrap(tree, path) {
  for (const key of path) {
    if (!tree) return;
    if (!(key in tree)) return undefined;
    tree = tree[key];
  }
  return tree;
}

export default function decorate(graph, links = [] /* aliases */) {
  const result = decorateChildren(graph, links);

  let link;
  while ((link = links.shift())) {
    const [from, key, path] = link;
    const node = unwrap(result, path);
    if (node === LINK_PLACEHOLDER) {
      // Try this link again later. This is to resolve multi-hop links.
      // TODO: Cycle detection.
      links.push(link);
    } else {
      from[key] = node;
    }
  }
  return result;
}

function decorateChildren(graph, links) {
  const isPage = graph.some(node => isRange(node));
  if (isPage) {
    return decoratePage(graph, links);
  } else {
    return decorateBranch(graph, links);
  }
}

function decoratePage(graph, links) {
  const result = [];
  for (const node of graph) {
    if (isRange(node)) continue;
    if (isLink(node)) {
      links.push([result, result.length, node.path]);
      result.push(LINK_PLACEHOLDER); // Placeholder that will get replaced.
      continue;
    }
    if (isBranch(node)) {
      result.push(decorateChildren(node.children, links));
      continue;
    }
    result.push(node.value);
  }
  return result;
}

function decorateBranch(graph, links) {
  const result = {};
  for (const node of graph) {
    const key = node.key;
    if (isRange(node)) continue;
    if (isLink(node)) {
      links.push([result, key, node.path]);
      result[key] = LINK_PLACEHOLDER;
      continue;
    }
    if (isBranch(node)) {
      result[key] = decorateChildren(node.children, links);
      continue;
    }
    if (node.value !== null) result[key] = node.value;
  }
  return result;
}
