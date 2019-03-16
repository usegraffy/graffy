import { makePath } from './path';

export const LINK_KEY = '🔗';
export const PAGE_KEY = '__page__';
export const MIN_KEY = '';
export const MAX_KEY = '\uffff';

export function getPage(tree) {
  const [start, end] = tree[PAGE_KEY] || [MIN_KEY, MAX_KEY];
  const hasNext = end !== MAX_KEY;
  const hasPrev = start !== MIN_KEY;
  return { start, end, hasNext, hasPrev };
}

export function getLink(node) {
  return node[LINK_KEY];
}

export function makeLink(path) {
  return { [LINK_KEY]: makePath(path) };
}

export function makePage(node, start, end) {
  node[PAGE_KEY] = [start, end];
  return node;
}
