import {
  decode as decodeArgs,
  encode as encodeArgs,
  splitArgs,
} from './args.js';
import { decode as decodePath, encode as encodePath } from './path.js';
import { isEmpty, isDef, isArgObject } from '../util.js';
import { keyAfter, merge, add } from '../ops/index.js';
import { wrap } from '../path/index.js';
import finalize from './graph/finalize.js';
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
    child.$key = decodeArgs(node);
    return child;
    //
    // const object = Object.assign(
    //   { $key: decodeArgs(node) },
    //   Array.isArray(child) ? { $chi: child } : child,
    // );
    //
    // return object;
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

//------------------------- Encode ----------------------

const ROOT_KEY = Symbol();

/**
  @param {InTree} value
  @param {number} options.version
  @param {boolean} options.isGraph
*/
export function encode(value, { version, isGraph } = {}) {
  const links = [];

  function pushLink(rest, key, node) {
    if (!isEmpty(rest)) {
      links.push(
        wrap(
          makeNode(rest, key, node.version).children,
          node.path,
          node.version,
        )[0],
      );
    }
  }

  const combine = isGraph ? merge : add;

  function makeNode(object, key, ver) {
    if (!isDef(object)) return;
    if (typeof object === 'object' && object && isEmpty(object)) return;

    const { $key, $ref, $ver, $val, $chi, $put, ...rest } = object || {};

    if (!isDef(key) && !isDef($key)) {
      throw Error(`makeNode.no_key: ${JSON.stringify(value)}`);
    }

    if (isArgObject($key)) {
      const { page, filter } = splitArgs($key);
      if (!isEmpty(page) && !isEmpty(filter)) {
        console.log('Filters!', $key);
        const node = makeNode({
          $key: filter,
          $chi: [{ ...object, $key: page }],
        });
        node.filter = true;
        return node;
      }
    }

    if ($key && (Number.isInteger(key) || !isDef(key))) key = $key;
    if ($ver) ver = $ver;

    const node = key === ROOT_KEY ? {} : encodeArgs(key);
    node.version = ver;

    if (object === null) {
      node.end = node.key;
    } else if ($val === true) {
      node.value = rest;
    } else if (isDef($val)) {
      node.value = $val;
    } else if ($ref) {
      node.path = encodePath($ref);
      pushLink(rest, key, node);
      if (!isGraph) return; // Drop query aliases from encoded format
    } else if (typeof object !== 'object') {
      node.value = isGraph || typeof object === 'number' ? object : 1;
    } else if (isDef($chi)) {
      let children = $chi
        .map((obj) => makeNode(obj, undefined, ver))
        .filter(Boolean)
        .sort((a, b) => (a.key <= b.key ? -1 : 1));

      if (children.length) {
        node.children = children;
      }
    } else if (Array.isArray(object)) {
      let children = object
        .map((obj, i) => makeNode(obj, i, ver))
        .filter(Boolean)
        .sort((a, b) => (a.key <= b.key ? -1 : 1));

      if (children.length) {
        node.children = children;
      }
    } else {
      if (isDef($key) && key !== $key) {
        node.children = [makeNode(object, undefined, ver)].filter(Boolean);
      } else {
        const children = Object.keys(rest)
          .sort()
          .map((key) => makeNode(object[key], key, ver))
          .filter(Boolean);

        if (children.length) {
          node.children = children;
        } else if (isGraph) {
          if (!node.end) node.end = node.key;
        } else {
          node.value = 1;
        }
      }
    }

    let put = $put;
    // If this is a plain array (without keyed objects), we should "put" the
    // entire positive integer range to give it atomic write behavior.
    if (
      Array.isArray(object) &&
      object.length &&
      object.every((it) => !isDef(it?.$key))
    ) {
      put = [{ $since: 0, $until: +Infinity }];
    }

    if (isGraph && put) {
      node.children = finalize(
        node.children,
        put === true ? null : put.map((arg) => encodeArgs(arg)),
        node.version,
      );
    }

    if (
      node.children?.length ||
      isDef(node.end) ||
      isDef(node.value) ||
      isDef(node.path)
    ) {
      return node;
    }
  }

  let result = makeNode(value, ROOT_KEY, version)?.children || [];
  while (links.length) {
    combine(result, [links.pop()]);
  }
  return result;
}
