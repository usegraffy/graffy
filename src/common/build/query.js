import { encodeArgs } from '../encode/index.js';
export const ROOT_KEY = Symbol();

// We freeze constructed queries to guard against bugs that might mutate them.
// TODO: Don't freeze in production builds, as a perf optimization.
const freeze = (obj) => Object.freeze(obj);

function makeNode(object, key, ver) {
  if (!object) return;
  const { _key_, _opt_, ...rest } = object;

  if (!key && !_key_) {
    throw Error(`makeNode.no_key ${key} ${JSON.stringify(_key_)}`);
  }
  key = key || _key_;

  const node =
    key === ROOT_KEY
      ? {}
      : encodeArgs(Array.isArray(key) ? { cursor: key } : key);

  node.version = ver;

  if (Array.isArray(object)) {
    const children = object
      .map((obj) => makeNode(obj, undefined, ver))
      .filter(Boolean)
      .sort((a, b) => (a.key <= b.key ? -1 : 1));

    if (children.length) node.children = children;
  } else if (typeof object === 'object') {
    if (_key_ && key !== _key_) {
      node.children = [makeNode(object, undefined, ver)];
    } else {
      const children = Object.keys(rest)
        .sort()
        .map((key) => freeze({ key, ...makeNode(object[key], key, ver) }))
        .filter(Boolean);

      if (children.length) node.children = children;
    }
  } else {
    node.value = typeof object === 'number' ? object : 1;
  }

  if (node.end && !node.children) {
    console.log('Assigning a value to', [node.key, node.end]);
    node.value = 1;
  }

  if (node.children?.length || typeof node.value !== 'undefined') {
    return freeze(node);
  }
}

export default function query(obj, version = 0) {
  return makeNode(obj, ROOT_KEY, version).children;
}

/*

import { encodeArgs } from '../encode';

// We freeze constructed queries to guard against bugs that might mutate them.
// TODO: Don't freeze in production builds, as a perf optimization.
const freeze = (obj) => Object.freeze(obj);

function makeQuery(value, version) {
  if (Array.isArray(value)) {
    if (value.length === 1) value.unshift({});
    try {
      encodeArgs(value[0]);
    } catch (e) {
      console.error(e);
      console.log(value[0]);
    }
    return freeze({
      children: freeze([
        freeze({
          ...encodeArgs(value[0]),
          ...makeQuery(value[1], version),
        }),
      ]),
      version,
    });
  } else if (typeof value === 'object' && value) {
    return freeze({
      version,
      children: freeze(
        Object.keys(value)
          .sort()
          .map((key) => freeze({ key, ...makeQuery(value[key], version) })),
      ),
    });
  } else {
    return freeze({
      version,
      value: typeof value === 'number' ? value : 1,
    });
  }
}

export function query(obj, version = 0) {
  return makeQuery(obj, version).children;
}

*/
