import { encode as encodeTree } from '../tree.js';

export default function query(obj, version = 0) {
  return encodeTree(obj, { version, isGraph: true });
}

/* import { encodeArgs, encodePath } from '../index.js';
import { wrap } from '../../path/index.js';
import { isEmpty } from '../../util.js';
import { merge } from '../../ops/index.js';
import finalize from './finalize.js';
// import { format } from '@graffy/testing';

export const ROOT_KEY = Symbol();

function makeNode(object, key, ver, linked = []) {
  const { $key, $ref, $ver, $val, $put, $err, $opt, ...rest } = object || {};
  if (typeof key === 'undefined' && typeof $key === 'undefined') {
    throw Error(`makeNode.no_key`);
  }
  // if (key && $key) {
  //   throw Error(`makeNode.key_mismatch ${key} ${JSON.stringify($key)}`);
  // }

  // There should be no node at all if this is an empty object {} OR undefined,
  // but there SHOULD be a node if it is null
  if (
    typeof object === 'undefined' ||
    (typeof object === 'object' && object && isEmpty(object))
  ) {
    return;
  }

  let put = $put;

  if ($key && (typeof key === 'number' || typeof key === 'undefined')) {
    key = $key;
  }
  let { limit: _, ...node } = key === ROOT_KEY ? {} : encodeArgs(key);

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
    node.path = encodePath($ref);
    if (!isEmpty(rest)) {
      linked.push(
        wrap(
          makeNode(rest, key, node.version, linked).children,
          node.path,
          node.version,
        )[0],
      );
    }
  } else if (Array.isArray(object)) {
    const isKeyed = object.every((it) => it?.$key);
    const children = object
      .map((obj, i) => makeNode(obj, i, node.version, linked))
      .filter(Boolean)
      .reduce((acc, node) => merge(acc, [node]), []);

    if (children.length) {
      // If this is not a keyed array, we have numeric keys, and we should
      // "put" the entire range of possible indexes to ensure that plain
      // arrays behave like atomic values.
      if (!isKeyed) put = [{ $since: 0, $until: +Infinity }];

      node.children = children;
    }
  } else if (typeof object === 'object') {
    if ($key && key !== $key) {
      node.children = [makeNode(object, undefined, ver)].filter(Boolean);
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

  if (put) {
    node.children = finalize(
      node.children,
      put === true ? null : put.map((arg) => encodeArgs(arg)),
      node.version,
    );
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
    for (const linkedNode of linked) merge(node.children, [linkedNode]);
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
  if (rootObject === null) return [{ key: '', end: '\uffff', version: 0 }];
  if (typeof rootObject === 'undefined') return [];
  return makeNode(rootObject, ROOT_KEY, version)?.children || [];
}
*/
