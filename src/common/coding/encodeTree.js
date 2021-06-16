import { encode as encodeArgs, splitArgs } from './args.js';
import { encode as encodePath } from './path.js';
import { isEmpty, isDef, isPlainObject } from '../util.js';
import { merge, add, wrap, finalize } from '../ops/index.js';

const ROOT_KEY = Symbol();

/**
  @param {InTree} value
  @param {number} options.version
  @param {boolean} options.isGraph
*/
function encode(value, { version, isGraph } = {}) {
  const links = [];

  function pushLink(key, node, rest, $val, $chi) {
    // prettier-ignore
    const children =
      !isEmpty(rest) ? makeNode(rest, key, node.version).children :
      isDef($chi) ? makeNode($chi, key, node.version).children :
      isDef($val) ? $val : undefined;

    if (children) {
      links.push(wrap(children, node.path, node.version)[0]);
    }
  }

  const combine = isGraph ? merge : add;

  function makeNode(object, key, ver) {
    if (!isDef(object)) return;
    if (typeof object === 'object' && object && isEmpty(object)) return;

    const { $key, $ref, $ver, $val, $chi, $put, ...rest } = object || {};

    if (isDef($ver)) ver = $ver;

    if (isPlainObject($key)) {
      const [page, filter] = splitArgs($key);
      if (isGraph && page && !isDef(page.$cursor)) {
        const node = makeNode({ ...object, $key: filter || '' }, key, ver);
        node.prefix = true;
        return node;
      }
      if (page && filter) {
        const node = makeNode(
          {
            $key: filter,
            $chi: [
              {
                ...object,
                $key: isDef(page.$cursor) ? page.$cursor : page,
              },
            ],
          },
          key,
          ver,
        );
        node.prefix = true;
        return node;
      }
    }

    if (isDef($key) && (Number.isInteger(key) || !isDef(key))) key = $key;
    const node = key === ROOT_KEY || !isDef(key) ? {} : encodeArgs(key);
    node.version = ver;

    if (object === null) {
      node.end = node.key;
    } else if (isDef($key) && isDef(key) && key !== $key) {
      // An array has been skipped because there is only one child.
      node.children = [makeNode(object, undefined, ver)].filter(Boolean);
    } else if ($ref) {
      node.path = encodePath($ref);
      if (!isGraph) return; // Drop query aliases from encoded format
      pushLink(key, node, rest, $val, $chi);
    } else if ($val === true) {
      node.value = rest;
    } else if (isDef($val)) {
      node.value = $val;
    } else if (typeof object !== 'object') {
      node.value = isGraph || typeof object === 'number' ? object : 1;
    } else if (isDef($chi)) {
      const children = $chi
        .map((obj) => makeNode(obj, undefined, ver))
        .filter(Boolean)
        .sort((a, b) => (a.key <= b.key ? -1 : 1));

      if (children.length) {
        node.children = children;
      }
    } else if (Array.isArray(object)) {
      const children = object
        .map((obj, i) => makeNode(obj, i, ver))
        .filter(Boolean)
        .reduce((acc, it) => {
          combine(acc, [it]);
          return acc;
        }, []);
      // .sort((a, b) => (a.key <= b.key ? -1 : 1));

      if (children.length) {
        node.children = children;
      }
    } else {
      const children = Object.keys(rest)
        .sort()
        .map((key) => makeNode(object[key], key, ver))
        .filter(Boolean);

      if (children.length) {
        node.children = children;
      } else if (isGraph) {
        if (node.key && !node.end) node.end = node.key;
      } else {
        node.value = 1;
      }
    }

    let putQuery;
    // If this is a plain array (without keyed objects), we should "put" the
    // entire positive integer range to give it atomic write behavior.
    if (Array.isArray(object) && !object.some((it) => isDef(it?.$key))) {
      putQuery = [encodeArgs({ $since: 0, $until: +Infinity })];
    }

    if ($put === true) {
      putQuery = null;
    } else if (Array.isArray($put)) {
      putQuery = $put.map((arg) => encodeArgs(arg));
    } else if (isDef($put)) {
      putQuery = [encodeArgs($put)];
    }

    if (isGraph && isDef(putQuery)) {
      node.children = finalize(node.children || [], putQuery, node.version);
    }

    if (
      (key === ROOT_KEY || isDef(node.key)) &&
      (node.children?.length ||
        isDef(node.end) ||
        isDef(node.value) ||
        isDef(node.path))
    ) {
      return node;
    }
  }

  if (value?.$key) value = [value];
  let result = makeNode(value, ROOT_KEY, version)?.children || [];

  while (links.length) {
    combine(result, [links.pop()]);
  }
  return result;
}

export function encodeGraph(obj, version = Date.now()) {
  return encode(obj, { version, isGraph: true });
}

export function encodeQuery(obj, version = 0) {
  return encode(obj, { version, isGraph: false });
}
