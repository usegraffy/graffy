import { isRange, isBranch } from '../node';
import { decodeArgs } from '../encode/index.js';

export default function decorateQuery(query) {
  const result = decorateChildren(query);
  return result;
}

function decorateChildren(query) {
  const isPage = query.some((node) => isRange(node));
  if (isPage) {
    return decoratePage(query);
  } else {
    return decorateBranch(query);
  }
}

function decoratePage(query) {
  const result = [];
  for (const node of query) {
    const args = decodeArgs(node);
    const child = isBranch(node) ? decorateChildren(node.children) : {};
    child._key_ = args;
    // Object.defineProperty(child, '_key_', { value: args });
    result.push(child);
  }

  return result.length === 1 ? result[0] : result;
}

function decorateBranch(query) {
  const result = {};
  for (const node of query) {
    const child = isBranch(node) ? decorateChildren(node.children) : true;
    const { key } = node;
    result[key] = child;
  }
  return result;
}
