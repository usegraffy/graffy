import { isRange, isBranch, isLink } from '../node';
import pageInfo from './pageInfo';

const LINK_PLACEHOLDER = Symbol();

export function descend(tree, path) {
  let node = tree;
  for (const key of path) {
    if (!node) return;
    if (!(key in node)) return undefined;
    node = node[key];
  }
  return node;
}

export default function decorate(graph, links = []) {
  const result = graph && decorateChildren(graph, links);

  let link;
  while ((link = links.shift())) {
    const [from, key, path] = link;
    const node = descend(result, path);
    if (node === LINK_PLACEHOLDER) {
      // Try this link again later. This is to resolve multi-hop links.
      // TODO: Cycle detection.
      links.push(link);
    } else {
      // if (typeof node === 'undefined' || node === null) {
      //   console.warn('Decorate: Link', path, 'is', node);
      // }
      from[key] = node;
    }
  }
  return result;
}

function decorateChildren(graph, links) {
  const isPage = graph.some((node) => isRange(node) && node.key !== node.end);
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
      result.push(LINK_PLACEHOLDER); // Placeholder that will read replaced.
      continue;
    }
    if (isBranch(node)) {
      result.push(decorateChildren(node.children, links));
      continue;
    }
    result.push(node.value);
  }

  Object.defineProperty(result, 'pageInfo', { value: pageInfo(graph) });
  // result.pageInfo = pageInfo(graph);
  return result;
}

function decorateBranch(graph, links) {
  const result = {};
  for (const node of graph) {
    const key = node.key;
    if (isRange(node)) {
      result[key] = null;
      continue;
    }
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
