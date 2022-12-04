import isEqual from 'lodash/isEqual.js';
import { encode as encodeArgs, splitArgs } from './args.js';
import { encode as encodePath, splitRef } from './path.js';
import { isEmpty, isDef, isPlainObject, cmp, MIN_KEY } from '../util.js';
import { merge, add, wrap, finalize, setVersion } from '../ops/index.js';

const ROOT_KEY = Symbol();

/**
  @param {any} value
  @param {{version?: number, isGraph?: boolean}} options
*/
function encode(value, { version, isGraph } = {}) {
  const links = [];

  function pushLink($ref, $ver, props, $val, $chi) {
    const [range, _] = splitRef($ref);

    const node = !isEmpty(props)
      ? makeNode(range ? [{ $key: range, ...props }] : props, undefined, $ver)
      : isDef($chi)
      ? makeNode(range ? [{ $key: range, $chi }] : $chi, undefined, $ver)
      : null;

    // prettier-ignore
    const children =
      node ? node.children :
      isDef($val) ? $val :
      isGraph ? undefined : 1;

    if (children) {
      links.push(wrap(children, encodePath($ref), $ver, !!range)[0]);
    }
  }

  const combine = isGraph ? merge : add;

  function makeNode(object, key, ver, parentPuts = []) {
    if (!isDef(object)) return;

    const { $key, $ver, $ref, $val, $chi, $put, ...props } = object || {};

    // Turn any non-enumerable properties of object into enumerable,
    // so they're incleded in ...object below.
    if (typeof object === 'object' && object && !Array.isArray(object)) {
      object = {
        ...Object.fromEntries(
          Object.entries({
            $key,
            $ver,
            $ref,
            $val,
            $chi,
            $put,
          }).filter(([_, val]) => isDef(val)),
        ),
        ...props,
      };
    }

    // An empty object is considered equivalent to undefined.
    if (typeof object === 'object' && object && isEmpty(object)) return;

    if (isDef($ver)) ver = $ver;

    if (isPlainObject($key)) {
      const [page, filter] = splitArgs($key);
      if (page) {
        /* 
        CONSTRUCT PREFIX NODES
        When we encounter a range key in a graph, it means one of these:
        1. an empty range, e.g. { $key: { $after: 'foo' } }
        2. a range reference, e.g.
            { $key: { x: 1, $all: true }, $ref: ['foo', { $all: true }] }
        3. as a shortcut to avoid repetition in query results e.g.
            { $key: { x: 1, $all: true }, $chi: [
              { $key: 'a', $val: 'A' },
              { $key: 'b', $val: 'B' } ] }
          is equivalent to:
            [ { $key: { x: 1, $before: 'a' } },
              { $key: { x: 1, $cursor: 'a' }, $val: 'A' },
              { $key: { x: 1, $after: 'a', $before: 'b' } },
              { $key: { x: 1, $cursor: 'b' }, $val: 'B' } ]

        Cases 2. and 3. are handled below: Basically we strip out the "page"
        part from the key (leaving only the filter), construct a node with that,
        then add the "prefix" flag to the node.

        The page part is passed as $put for constructing children (when it's a 
        graph with children)
      */

        const foundPuts = parentPuts
          .filter(([_, putFilter]) => isEqual(filter, putFilter))
          .map(([range]) => range);

        if (
          isGraph &&
          !isDef(page.$cursor) &&
          ($ref || $val || $chi || $put || !isEmpty(props))
        ) {
          object.$key = filter || {};
          object.$put = foundPuts;
          const node = makeNode(object, key, ver);
          if (!filter) node.key = MIN_KEY;
          node.prefix = true;
          return node;
        }

        if (
          (!isDef(key) || Number.isInteger(key)) &&
          (filter || isDef(page.$cursor))
        ) {
          object.$key = isDef(page.$cursor) ? page.$cursor : page;
          const wrapper = { $key: filter || {}, $chi: [object] };
          if (isGraph) wrapper.$put = foundPuts;
          const node = makeNode(wrapper, key, ver);
          if (!filter) node.key = MIN_KEY;
          node.prefix = true;
          return node;
        }

        // console.log('No prefix made', { key, $key, object });
      }
    }

    let putQuery = [],
      prefixPuts = [];
    // If this is a plain array (without keyed objects), we should "put" the
    // entire positive integer range to give it atomic write behavior.
    if (Array.isArray(object) && !object.some((it) => isDef(it?.$key))) {
      putQuery = [encodeArgs({ $since: 0, $until: +Infinity })];
    }

    function classifyPut(put) {
      const [range, filter] = splitArgs(put);
      if (filter) {
        prefixPuts.push([range, filter]);
      } else {
        putQuery.push(encodeArgs(put));
      }
    }

    if ($put === true) {
      putQuery = null;
    } else if (Array.isArray($put)) {
      $put.forEach(classifyPut);
    } else if (isDef($put)) {
      classifyPut($put);
    }

    if (isDef($key) && (Number.isInteger(key) || !isDef(key))) key = $key;
    const node = key === ROOT_KEY || !isDef(key) ? {} : encodeArgs(key);
    // console.log('Set version', node.key, ver);
    node.version = ver;

    // console.log('Constructed', { node, $key, key });

    if (object === null) {
      node.end = node.key;
    } else if (isDef($key) && isDef(key) && key !== $key) {
      // An array has been omitted because there is only one child.
      node.children = [makeNode(object, undefined, ver, prefixPuts)].filter(
        Boolean,
      );
      // We don't want to add a $put at this level.
      return node;
    } else if ($ref) {
      pushLink($ref, node.version, props, $val, $chi);
      if (!isGraph) return; // Drop query aliases from encoded format
      node.path = encodePath($ref);
    } else if ($val === true) {
      node.value = props;
    } else if (isDef($val)) {
      node.value = $val;
    } else if (typeof object !== 'object') {
      node.value = isGraph || typeof object === 'number' ? object : 1;
    } else if (isDef($chi)) {
      const children = $chi
        .map((obj) => makeNode(obj, undefined, ver, prefixPuts))
        .filter(Boolean)
        .sort((a, b) => cmp(a.key, b.key));

      if (children.length) {
        node.children = children;
      }
    } else if (Array.isArray(object)) {
      const children = object
        .map((obj, i) => makeNode(obj, i, ver, prefixPuts))
        .filter(Boolean)
        .reduce((acc, it) => {
          combine(acc, [it]);
          return acc;
        }, []);

      if (children.length) {
        node.children = children;
      }
    } else {
      const children = Object.keys(props)
        .sort()
        .map((key) => makeNode(object[key], key, ver))
        .filter(Boolean);

      if (children.length) {
        node.children = children;
      } else if (isGraph) {
        // Some inconsistency here.
        // { foo: {} } === undefined (we know nothing)
        // but { $key: 'foo' }] === { foo: null } (we know foo doesn't exist)
        // This is because when using the $key notation, we can't use null.
        if (!isDef($key) && !isDef($put)) return;
        if (node.key && !node.end) node.end = node.key;
      } else {
        if (!isDef($key)) return;
        node.value = 1;
      }
    }

    if (isGraph && (putQuery === null || putQuery.length)) {
      node.children = finalize(node.children || [], putQuery, false);
    }

    if (
      // (key === ROOT_KEY || isDef(node.key)) &&
      node.children?.length ||
      isDef(node.end) ||
      isDef(node.value) ||
      isDef(node.path)
    ) {
      return node;
    }
  }

  if (value?.$key) value = [value];
  let result = makeNode(value, ROOT_KEY, version)?.children || [];

  while (links.length) {
    combine(result, [links.pop()]);
  }

  // console.log('Encoded', isGraph, value);
  // console.log('Result', result);
  return result;
}

export function encodeGraph(obj, version = Date.now()) {
  const encoded = encode(obj, { version, isGraph: true });
  const versioned = setVersion(encoded, version, true);
  return versioned;
}

export function encodeQuery(obj, version = 0) {
  return encode(obj, { version, isGraph: false });
}
