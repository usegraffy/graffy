import { isRange, isBranch, isLink } from '../node';
import { empty } from '../util.js';
import { decodeArgs } from '../encode/index.js';
import pageInfo from './pageInfo';

const LINK_PLACEHOLDER = Symbol();

export function descend(tree, path) {
  let node = tree;
  for (const key of path) {
    if (!node) return;
    if (Array.isArray(node)) node = node.props;
    if (!(key in node)) return undefined;
    node = node[key];
  }
  return node;
}

export default function decorate(graph, links = []) {
  const result = graph && decorateChildren(graph, links);

  let link;
  while ((link = links.shift())) {
    const [from, key, path, args] = link;
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
      if (typeof node === 'object' && node) {
        node._ref_ = path;
        if (args) node._key_ = args;
      }
    }
  }
  return result;
}

function decorateChildren(graph, links) {
  // const isPage = graph.some((node) => node.key[0] === '\0');
  // const result = isPage ? [] : {};

  const resArr = [];
  const resObj = {};

  for (const node of graph) {
    const key = node.key;
    if (key[0] === '\0') {
      if (isRange(node)) continue;

      let args = decodeArgs(node);
      const { cursor, ...rest } = args;
      if (empty(rest) && Array.isArray(cursor)) args = cursor;

      if (isLink(node)) {
        links.push([resArr, resArr.length, node.path, args]);
        resArr.push(LINK_PLACEHOLDER); // Placeholder that will be replaced.
        continue;
      }
      if (isBranch(node)) {
        const child = decorateChildren(node.children, links);
        child._key_ = args;
        resArr.push(child);
        continue;
      }

      if (typeof node.value === 'object') {
        const child = Object.create(node.value);
        child._key_ = args;
        child._val_ = node.value;
        resArr.push(child);
      } else {
        resArr.push(node.value);
      }
    } else {
      if (isRange(node)) {
        resObj[key] = null;
        continue;
      }
      if (isLink(node)) {
        links.push([resObj, key, node.path]);
        resObj[key] = LINK_PLACEHOLDER;
        continue;
      }
      if (isBranch(node)) {
        resObj[key] = decorateChildren(node.children, links);
        continue;
      }
      if (node.value !== null) resObj[key] = node.value;
    }
  }

  if (resArr.length) {
    Object.defineProperty(resArr, 'pageInfo', { value: pageInfo(graph) });
    Object.defineProperty(resArr, 'props', { value: resObj });
    return resArr;
  } else {
    return resObj;
  }
}

//
// function decoratePage(graph, links) {
//   const result = [];
//   for (const node of graph) {
//     if (node.key[0] !== '\0') continue;
//     if (isRange(node)) continue;
//     if (isLink(node)) {
//       links.push([result, result.length, node.path]);
//       result.push(LINK_PLACEHOLDER); // Placeholder that will read replaced.
//       console.log('link', links, result);
//       continue;
//     }
//     if (isBranch(node)) {
//       result.push(decorateChildren(node.children, links));
//       continue;
//     }
//     result.push(node.value);
//   }
//
//   Object.defineProperty(result, 'pageInfo', { value: pageInfo(graph) });
//   return result;
// }
//
// function decorateBranch(graph, links) {
//   const result = {};
//   for (const node of graph) {
//     const key = node.key;
//     if (isRange(node)) {
//       result[key] = null;
//       continue;
//     }
//     if (isLink(node)) {
//       links.push([result, key, node.path]);
//       result[key] = LINK_PLACEHOLDER;
//       continue;
//     }
//     if (isBranch(node)) {
//       result[key] = decorateChildren(node.children, links);
//       continue;
//     }
//     if (node.value !== null) result[key] = node.value;
//   }
//   return result;
// }
