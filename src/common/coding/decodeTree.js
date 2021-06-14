import { decode as decodeArgs, splitArgs } from './args.js';
import { decode as decodePath } from './path.js';
import { isEmpty, isDef } from '../util.js';
import { keyAfter } from '../ops/index.js';
import { isRange, isBranch, isPrefix, isLink } from '../node/index.js';

/**
  @param {Tree} node
  @param {boolean} options.isGraph
*/
function decode(nodes, { isGraph } = {}) {
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
          if (key === keyAfter(lastNode.end)) {
            lastNode.end = end || key;
            return end && end !== key;
          }
        } else {
          if (key === keyAfter(lastNode.key)) key = lastNode.key;
        }
      }

      if (end && key !== end) {
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

    // Use a simplified format if all the keys are numbers or strings.
    if (allNums || allStrs) {
      result = result.reduce(
        (collection, item) => {
          if (Array.isArray(item)) {
            collection[item.$key] = item;
            delete item.$key;
            return collection;
          }

          const { $key, $val, ...rest } = item;

          if (typeof $val === 'object') $val.$val = true;
          // prettier-ignore
          collection[$key] = (
            isDef($val) ? $val :
            !isEmpty(rest) ? rest :
            isGraph ? null : true
          );
          return collection;
        },
        allStrs ? {} : [],
      );
    }

    if (isGraph && putRanges.length) {
      if (
        putRanges.length === 1 &&
        putRanges[0].key === '' &&
        putRanges[0].end === '\uffff'
      ) {
        result.$put = true;
      } else {
        result.$put = putRanges.map((rNode) => decodeArgs(rNode));
      }
    }

    return result;
  }

  function decodePrefixNode(node) {
    // if (!isBranch(node)) {
    //   throw Error('decode.prefix_without_children: ' + node.key);
    // }

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
      return [{ $key: args, $ref }];
    }

    const children = decodeChildren(node.children);

    if (!Array.isArray(children)) {
      throw Error('decode.prefix_without_encoded_child_keys:' + node.key);
    }

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
    return child;
  }

  /**
    Only for graphs;
  */
  function decodeRangeNode(node) {
    if (node.key === node.end) return { $key: decodeArgs({ key: node.key }) };
  }

  function decodeLinkNode(node) {
    return { $key: decodeArgs(node), $ref: decodePath(node.path) };
  }

  return decodeChildren(nodes);
}

export function decodeGraph(graph) {
  return decode(graph, { isGraph: true });
}

export function decodeQuery(query) {
  return decode(query, { isGraph: false });
}
