import { isRange, isBranch } from '../../node';
import { decodeArgs } from '../index.js';

export default function decodeQuery(query) {
  const result = decodeChildren(query);
  return result;
}

function decodeChildren(query) {
  const isPage = query.some((node) => isRange(node));
  if (isPage) {
    return decodeGraphPage(query);
  } else {
    return decodeGraphBranch(query);
  }
}

function decodeGraphPage(query) {
  const result = [];
  for (const node of query) {
    const args = decodeArgs(node);
    const child = isBranch(node) ? decodeChildren(node.children) : {};
    child.$key = args;
    // Object.defineProperty(child, '$key', { value: args });
    result.push(child);
  }

  return result.length === 1 ? result[0] : result;
}

function decodeGraphBranch(query) {
  const result = {};
  for (const node of query) {
    const child = isBranch(node) ? decodeChildren(node.children) : true;
    const { key } = node;
    result[key] = child;
  }
  return result;
}
