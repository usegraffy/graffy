import { encodeArgs } from '../encode/index.js';
import { makePath } from '../path/index.js';

export const ROOT_KEY = Symbol();

function makeNode(object, key, ver) {
  const { _key_, _ref_, _ver_, _val_, _err_, _opt_, ...rest } = object || {};
  if (!key && !_key_) {
    throw Error(`makeNode.no_key ${key} ${JSON.stringify(_key_)}`);
  }
  if (key && _key_) {
    throw Error(`makeNode.key_mismatch ${key} ${JSON.stringify(_key_)}`);
  }

  key = key || _key_;

  // if ('_ver_' in object && ver !== _ver_) {
  //   throw Error(`graph.bad_ver ${ver} ${_ver_}`);
  // }

  const node =
    key === ROOT_KEY
      ? {}
      : encodeArgs(Array.isArray(key) ? { cursor: key } : key);

  node.version = ver;

  // if (typeof _ref_ !== 'undefined') node.path = makePath(_ref_);
  if (typeof _ver_ !== 'undefined') node.version = _ver_;
  if (typeof _err_ !== 'undefined') node.error = _err_;
  if (typeof _opt_ !== 'undefined') node.options = _opt_;

  if (object === null || _val_ === null) {
    node.end = node.key;
  } else if (typeof _val_ !== 'undefined') {
    node.value = _val_;
  } else if (_ref_) {
    node.path = makePath(_ref_);
  } else if (Array.isArray(object)) {
    const children = object
      .map((obj) => makeNode(obj, undefined, node.version))
      .filter(Boolean)
      .sort((a, b) => (a.key <= b.key ? -1 : 1));

    if (children.length) {
      node.children = children;
    }
  } else if (typeof object === 'object') {
    const children = Object.entries(rest)
      .map(([key, obj]) => makeNode(obj, key, node.version))
      .filter(Boolean)
      .sort((a, b) => (a.key <= b.key ? -1 : 1));

    if (children.length) {
      node.children = children;
    } else if (!node.end) {
      node.end = node.key;
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
  return makeNode(rootObject, ROOT_KEY, version).children;
}

/*
import { merge } from '../graph';
import { makePath } from '../path';
import { isRange } from '../node';
import { encodeArgs } from '../encode';

function makeGraph(key, value, version) {
  if (typeof value === 'function') {
    // This is a page or a link waiting for a version.
    return value(key, version);
  } else if (Array.isArray(value)) {
    // Convert the KV-tuple format to a graph
    return {
      key,
      version,
      children: value
        .map(({ key: k, name, value: v, children, path }) =>
          makeGraph(
            name || (k && encodeArgs(k).key),
            children || (path && link(path)) || (v && scalar(v)),
            version,
          ),
        )
        .sort((a, b) => (a.key <= b.key ? -1 : 1)),
    };
  } else if (value === null) {
    // This is a single key known to be missing.
    return { key, end: key, version };
  } else if (typeof value === 'object' && value) {
    return {
      key,
      version,
      children: Object.keys(value)
        .sort()
        .map((k) => makeGraph(k, value[k], version)),
    };
  } else {
    return { key, version, value };
  }
}

export function graph(obj, version = Date.now()) {
  // console.log('makeGraph called with', obj);
  if (!obj) return obj;
  return makeGraph('', obj, version).children;
}

export function page(obj, key = '\0', end = '\0\uffff') {
  return (outerKey, version) => {
    const nodes = Object.keys(obj).map(k => { ...encodeArgs({ cursor }, graph(obj[k], version)});
    const gaps = merge(
      [{ key, end, version }],
      Object.keys(obj).map((cursor) => ({
        ...encodeArgs({ cursor }),
        value: 1,
        version,
      })),
    ).filter((node) => isRange(node));
    const children = merge(nodes, gaps);

    console.log('Page', children);

    return { key: outerKey, version, children };
  };
}

export function link(rawPath) {
  const path = makePath(rawPath);
  return (key, version) => ({ key, version, path });
}

export function scalar(value) {
  return (key, version) => ({ key, version, value });
}
*/
