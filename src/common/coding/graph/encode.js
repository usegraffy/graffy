import { encodeArgs } from '../index.js';
import { makePath, wrap } from '../../path/index.js';
import { isEmpty } from '../../util.js';
import { merge } from '../../ops/index.js';

export const ROOT_KEY = Symbol();

function makeNode(object, key, ver, linked = []) {
  const { $key, $ref, $ver, $val, $err, $opt, ...rest } = object || {};
  if (!key && !$key) {
    throw Error(`makeNode.no_key ${key} ${JSON.stringify($key)}`);
  }
  // if (key && $key) {
  //   throw Error(`makeNode.key_mismatch ${key} ${JSON.stringify($key)}`);
  // }

  key = key || $key;
  const node = key === ROOT_KEY ? {} : encodeArgs(key);

  node.version = ver;

  if (typeof $ver !== 'undefined') node.version = $ver;
  if (typeof $err !== 'undefined') node.error = $err;
  if (typeof $opt !== 'undefined') node.options = $opt;

  if (object === null || $val === null) {
    node.end = node.key;
  } else if ($val === true) {
    node.value = rest;
  } else if (typeof $val !== 'undefined') {
    node.value = $val;
  } else if ($ref) {
    node.path = makePath($ref);
    if (!isEmpty(rest))
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
    if ($key && key !== $key) {
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
