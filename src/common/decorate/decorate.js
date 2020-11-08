import { isRange, isBranch, isLink } from '../node';
import { empty } from '../util.js';
import { decodeArgs } from '../encode/index.js';
import pageInfo from './pageInfo';
import { format } from '@graffy/testing';
const LINK_PLACEHOLDER = Symbol();

function descend(tree, path) {
  let node = tree;
  for (const key of path) {
    if (!node) return;
    if (Array.isArray(node)) node = node.props;
    if (!(key in node)) return undefined;
    node = node[key];
  }
  return node;
}

export default function decorate(graph, query, links = []) {
  const result = graph && decorateChildren(graph, query, links);

  let link;
  while ((link = links.shift())) {
    const [from, key, path, args] = link;
    const node = descend(result, path);
    // console.log('resolving link', link, 'found', node, 'in', result);
    if (node === LINK_PLACEHOLDER) {
      // Try this link again later. This is to resolve multi-hop links.
      // TODO: Cycle detection.
      links.push(link);
    } else {
      // if (typeof node === 'undefined' || node === null) {
      //   console.warn('Decorate: Link', path, 'is', node);
      // }
      // console.log('Replacing placeholder at', key, 'with', node);
      from[key] = node;
      if (typeof node === 'object' && node) {
        node._ref_ = path;
        if (args) node._key_ = args;
      }
    }
  }
  return result;
}

function decorateChildren(graph, query, links) {
  // const isPage = graph.some((node) => node.key[0] === '\0');
  // const result = isPage ? [] : {};

  const isArr =
    Array.isArray(query) ||
    (query &&
      query._key_ &&
      (query._key_.first ||
        query._key_.last ||
        query._key_.after ||
        query._key_.before ||
        query._key_.since ||
        query._key_.until));

  const resArr = [];
  const resObj = {};

  // console.log('query', query, isArr);

  for (const node of graph) {
    // console.log('node', node);

    const key = node.key;
    if (isArr || key[0] === '\0') {
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
        // TODO: Find which query branch this falls under?
        const child = decorateChildren(node.children, query?.[0], links);
        child._key_ = args;
        resArr.push(child);
        continue;
      }

      if (typeof node.value === 'object') {
        const child = Object.create(node.value);
        child._key_ = args;
        child._val_ = node.value;
        // TODO: defineProperty toJSON to return { _val_: child.slice(0) }
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
        resObj[key] = decorateChildren(node.children, query?.[key], links);
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
