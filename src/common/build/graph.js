import { encodeArgs } from '../encode/index.js';
import { makePath, wrap } from '../path/index.js';
import { empty } from '../util.js';
import { merge } from '../graph/index.js';

export const ROOT_KEY = Symbol();

function makeNode(object, key, ver, linked = []) {
  const { _key_, _ref_, _ver_, _val_, _err_, _opt_, ...rest } = object || {};
  if (!key && !_key_) {
    throw Error(`makeNode.no_key ${key} ${JSON.stringify(_key_)}`);
  }
  // if (key && _key_) {
  //   throw Error(`makeNode.key_mismatch ${key} ${JSON.stringify(_key_)}`);
  // }

  key = key || _key_;
  const node = key === ROOT_KEY ? {} : encodeArgs(key);

  node.version = ver;

  if (typeof _ver_ !== 'undefined') node.version = _ver_;
  if (typeof _err_ !== 'undefined') node.error = _err_;
  if (typeof _opt_ !== 'undefined') node.options = _opt_;

  if (object === null || _val_ === null) {
    node.end = node.key;
  } else if (typeof _val_ !== 'undefined') {
    node.value = _val_;
  } else if (_ref_) {
    node.path = makePath(_ref_);
    if (!empty(rest))
      linked.push(wrap(makeNode(rest, key, node.version, linked), node.path));
  } else if (Array.isArray(object)) {
    const children = object
      .map((obj) => makeNode(obj, undefined, node.version, linked))
      .filter(Boolean)
      .reduce((acc, node) => merge(acc, [node]), []);

    if (children.length) {
      node.children = children;
    }
  } else if (typeof object === 'object') {
    if (_key_ && key !== _key_) {
      node.children = [makeNode(object, undefined, ver)];
    } else {
      const children = Object.entries(rest)
        .map(([key, obj]) => makeNode(obj, key, node.version, linked))
        .filter(Boolean)
        .sort((a, b) => (a.key <= b.key ? -1 : 1));

      if (children.length) {
        node.children = children;
      } else if (!node.end) {
        node.end = node.key;
      }
    }
  } else {
    node.value = object;
  }

  // TODO: Uncomment to introduce version invariant.
  // if (typeof ver === 'undefined' && node.children?.length) {
  //   const cver = node.children[0].version;
  //   if (
  //     typeof cver !== undefined &&
  //     node.children.every(({ version }) => version === cver)
  //   ) {
  //     node.childen.forEach((child) => {
  //       delete child.version;
  //     });
  //   }
  // }

  if (key === ROOT_KEY) {
    node.children = node.children || [];
    for (const node of linked) merge(node.children, node.children);
  }

  if (
    node.children?.length ||
    typeof node.end !== 'undefined' ||
    typeof node.value !== 'undefined' ||
    typeof node.path !== 'undefined' ||
    typeof node.error !== 'undefined'
  ) {
    return node;
  }
}

export default function graph(rootObject, version = Date.now()) {
  if (typeof rootObject === 'undefined' || rootObject === null) {
    return rootObject;
  }
  return makeNode(rootObject, ROOT_KEY, version)?.children || [];
}
