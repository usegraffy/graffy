// import { isRange, isBranch } from '../../node/index.js';
// import { decodeArgs } from '../index.js';

import { decode as decodeTree } from '../tree.js';

export default function decodeQuery(query) {
  // const result = decodeChildren(query);
  // return result;

  return decodeTree(query, { isGraph: false });
}
/*
function decodeChildren(query) {
  const isPage = query.some((node) => isRange(node) || node.key[0] === '\0');
  if (isPage) {
    return decodePage(query);
  } else {
    return decodeBranch(query);
  }
}

function decodePage(query) {
  const result = [];
  for (const node of query) {
    const args = decodeArgs(node);
    if (node.prefix) {
      if (!isBranch(node)) throw Error('decode.prefix_without_children');
      const children = decodePage(node.children);
      for (const child of children) {
        child.$key = { ...args, ...child.$key };
        result.push(child);
      }
    } else {
      const child = isBranch(node) ? decodeChildren(node.children) : {};
      child.$key = args;
      result.push(child);
    }
  }
  return result;
}

function decodeBranch(query) {
  const result = {};
  for (const node of query) {
    const child = isBranch(node) ? decodeChildren(node.children) : true;
    const { key } = node;
    result[key] = child;
  }
  return result;
}
*/
