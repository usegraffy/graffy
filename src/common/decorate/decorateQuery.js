import { isRange, isBranch } from '../node';
import rangeToPage from './rangeToPage';

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
    const child = isBranch(node) ? decorateChildren(node.children) : true;
    if (isRange(node)) {
      const { key, end, count } = node;
      result.push(rangeToPage(key, end, count), child);
    } else {
      const { key } = node;
      result.push(rangeToPage(key, key, 1), child);
    }
  }

  return result;
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
