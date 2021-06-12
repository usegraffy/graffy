import { decode as decodeArgs } from './args.js';
import { decode as decodePath } from './path.js';
import { isEmpty, isDef } from '../util.js';
import { keyAfter } from '../ops/index.js';
import { isRange, isBranch, isPrefix, isLink } from '../node/index.js';

/**
  @param {Tree} node
  @param {boolean} options.isGraph
*/
export function decode(nodes, { isGraph } = {}) {
  function decodeChildren(nodes) {
    let result = [];
    let allStrs = true;
    let allNums = true;

    const putRanges = [];
    let lastNode = null;

    function pushResult(...objects) {
      for (const object of objects) {
        if (isDef(object) && !Number.isInteger(object.$key)) allNums = false;
        if (isDef(object) && typeof object.$key !== 'string') allStrs = false;
      }
      result.push(...objects);
    }

    function addPutRange({ key, end }) {
      if (lastNode) {
        if (lastNode.end) {
          if (key === keyAfter(lastNode.end)) {
            lastNode.end = end || key;
            return;
          }
        } else {
          if (key === keyAfter(lastNode.key)) key = lastNode.key;
        }
      }

      if (end && key !== end) {
        lastNode = { key, end };
        putRanges.push(lastNode);
      } else {
        lastNode = { key };
      }
    }

    for (const node of nodes) {
      if (isGraph) addPutRange(node);
      if (isPrefix(node)) pushResult(...decodePrefixNode(node));
      else if (isRange(node)) pushResult(decodeRangeNode(node));
      else if (isBranch(node)) pushResult(decodeBranchNode(node));
      else if (isLink(node)) pushResult(decodeLinkNode(node));
      else pushResult(decodeLeafNode(node));
    }

    if (isGraph) result = result.filter(isDef);

    // Use a simplified format if all the keys are numbers or strings.
    if (allNums || allStrs) {
      result = result.reduce(
        (collection, { $key, $chi, $val, ...rest }) => {
          if (typeof $val === 'object') $val.$val = true;
          // prettier-ignore
          collection[$key] = (
            isDef($val) ? $val :
            isDef($chi) ? $chi :
            !isEmpty(rest)? rest :
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
    if (!isBranch(node)) {
      throw Error('decode.prefix_without_children: ' + node.key);
    }

    const args = decodeArgs(node);
    if (typeof args !== 'string') {
      throw Error('decode.unencoded_prefix: ' + args);
    }

    const children = decodeChildren(node.children);
    if (!Array.isArray(children)) {
      throw Error('decode.prefix_without_encoded_child_keys:' + node.key);
    }

    for (const child of children) {
      if (typeof child.$key !== 'string') {
        throw Error('decode.prefix_with_unencoded_child_key:' + child.$key);
      }
      child.$key = { ...args, ...child.$key };
    }
    return children;
  }

  function decodeBranchNode(node) {
    const child = decodeChildren(node.children);
    const object = Object.assign(
      { $key: decodeArgs(node) },
      Array.isArray(child) ? { $chi: child } : child,
    );
    // console.log('Branch', object);
    return object;
  }

  function decodeLeafNode(node) {
    const child = isGraph ? { $val: node.value } : {};
    child.$key = decodeArgs(node);
    return child;
  }

  function decodeRangeNode(node) {
    if (isGraph) {
      if (node.key === node.end) {
        return { $key: decodeArgs({ key: node.key }) };
      }
    } else {
      return isBranch(node) ? decodeBranchNode(node) : decodeLeafNode(node);
    }
  }

  function decodeLinkNode(node) {
    return { $key: decodeArgs(node), $ref: decodePath(node.path) };
  }

  return decodeChildren(nodes);
}

/**
  @param {InTree} value
  @param {number} options.version
  @param {boolean} options.isGraph
*/
export function encode(value, { version, isGraph } = {}) {}
