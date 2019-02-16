import { META_KEY } from './constants';

export function getLink(node) {
  return node[META_KEY] && node[META_KEY].path;
}

export function setLink(node, link) {
  node[META_KEY] = node[META_KEY] || {};
  node[META_KEY].path = link;
}
