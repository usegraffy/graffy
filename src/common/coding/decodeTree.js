import { decode as decodeArgs, splitArgs } from './args.js';
import { decode as decodePath } from './path.js';
import { isEmpty, isDef, isMinKey, isMaxKey, cmp } from '../util.js';
import { keyAfter } from '../ops/index.js';
import { isRange, isBranch, isPrefix, isLink } from '../node/index.js';

/**
  @param {any[]} nodes
  @param {{ isGraph?: boolean }} options
*/
function decode(nodes = [], { isGraph } = {}) {
  function decodeChildren(nodes) {
    let result = [];
    let allStrs = true;
    let allNums = true;

    //Pushes objects to the result set and updates allStrs and allNums.
    function pushResult(...objects) {
      for (const object of objects) {
        if (isDef(object) && !Number.isInteger(object.$key)) allNums = false;
        if (isDef(object) && typeof object.$key !== 'string') allStrs = false;
      }
      result.push(...objects);
    }

    const putRanges = [];
    let lastNode = null;

    // Graphs only: Constructs the $put array. Returns true if this is a range
    // node that does not require to be added to the results.
    function addPutRange({ key, end }) {
      if (lastNode) {
        if (lastNode.end) {
          if (cmp(key, keyAfter(lastNode.end)) === 0) {
            lastNode.end = end || key;
            return end && cmp(end, key) !== 0;
          }
        } else {
          if (cmp(key, keyAfter(lastNode.key)) === 0) {
            key = lastNode.key;
          }
        }
      }

      if (end && cmp(key, end) !== 0) {
        lastNode = { key, end };
        putRanges.push(lastNode);
        return true;
      }

      lastNode = { key };
      return false;
    }

    for (const node of nodes) {
      if (isGraph && addPutRange(node)) continue;
      if (isPrefix(node)) pushResult(...decodePrefixNode(node));
      else if (isGraph && isRange(node)) pushResult(decodeRangeNode(node));
      else if (isBranch(node)) pushResult(decodeBranchNode(node));
      else if (isLink(node)) pushResult(decodeLinkNode(node));
      else pushResult(decodeLeafNode(node));
    }

    // Use a simplified format if all the keys are strings or it's a plain array.
    if (
      allStrs ||
      (allNums &&
        putRanges.length === 1 &&
        cmp(putRanges[0].key, 0) === 0 &&
        cmp(putRanges[0].end, +Infinity) === 0)
    ) {
      result = result.reduce(
        (collection, item) => {
          if (Array.isArray(item)) {
            collection[item.$key] = item;
            delete item.$key;
            return collection;
          }

          const { $key, $val } = item;
          delete item.$key;
          delete item.$val;

          if (typeof $val === 'object') {
            Object.defineProperty($val, '$val', { value: true });
          }
          // prettier-ignore
          collection[$key] = (
            isDef($val) ? $val :
            !isEmpty(item) || item.$ref || item.$put ? item :
            isGraph ? null : true
          );
          return collection;
        },
        allStrs ? {} : [],
      );
    }

    if (isGraph && putRanges.length) {
      if (isMinKey(putRanges[0].key) && isMaxKey(putRanges[0].end)) {
        Object.defineProperty(result, '$put', { value: true });
      } else {
        Object.defineProperty(result, '$put', {
          value: putRanges.map((rNode) => decodeArgs(rNode)),
        });
      }
    }

    return result;
  }

  function decodePrefixNode(node) {
    let args = decodeArgs(node);
    if (args === '') args = {};
    if (typeof args === 'string') {
      throw Error('decode.unencoded_prefix: ' + args);
    }

    if (isLink(node)) {
      args.$all = true;
      const $ref = decodePath(node.path);
      const lastKey = $ref[$ref.length - 1];
      if (typeof lastKey === 'string') {
        throw Error('decode.unencoded_prefix_ref: ' + node.path);
      }
      lastKey.$all = true;
      const linkObject = { $key: args };
      Object.defineProperty(linkObject, '$ref', { value: $ref });
      return [linkObject];
    }

    const children = decodeChildren(node.children);

    if (!Array.isArray(children)) {
      throw Error('decode.prefix_without_encoded_child_keys:' + node.key);
    }

    // console.log('Adding $cursor here', { node, children });

    for (const child of children) {
      if (typeof child.$key === 'string') {
        throw Error('decode.prefix_with_unencoded_child_key:' + child.$key);
      }
      if (!splitArgs(child.$key)[0]) {
        // splitArgs returns [page, filter]. If page is blank, it indicates
        // we have a bare cursor.
        child.$key = { $cursor: child.$key };
      }
      child.$key = { ...args, ...child.$key };
    }
    return children;
  }

  function decodeBranchNode(node) {
    const child = decodeChildren(node.children);
    child.$key = decodeArgs(node);
    return child;
  }

  function decodeLeafNode(node) {
    const child = isGraph ? { $val: node.value } : {};
    child.$key = decodeArgs(node);
    // console.log('Decoded leaf node', { node, child });
    return child;
  }

  /**
    Only for graphs;
  */
  function decodeRangeNode(node) {
    if (cmp(node.key, node.end) === 0) {
      return { $key: decodeArgs({ key: node.key }) };
    }
  }

  function decodeLinkNode(node) {
    const linkObject = { $key: decodeArgs(node) };
    Object.defineProperty(linkObject, '$ref', { value: decodePath(node.path) });
    return linkObject;
  }

  return decodeChildren(nodes);
}

export function decodeGraph(graph) {
  return decode(graph, { isGraph: true });
}

export function decodeQuery(query) {
  return decode(query, { isGraph: false });
}
