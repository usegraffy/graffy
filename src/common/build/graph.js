import { merge } from '../graph';
import { makePath } from '../path';

function makeGraph(key, value, version) {
  if (typeof value === 'function') {
    // This is a page or a link waiting for a version.
    return value(key, version);
  } else if (Array.isArray(value)) {
    console.warn('makeGraph: Found an array where an object was expected.');
    // This has already been converted to a CRDT graph
    return { key, version, children: value };
  } else if (value === null) {
    // This is a single key known to be missing.
    return { key, end: key, version };
  } else if (typeof value === 'object' && value) {
    return {
      key,
      version,
      children: Object.keys(value)
        .sort()
        .map(k => makeGraph(k, value[k], version)),
    };
  } else {
    return { key, version, value };
  }
}

export function graph(obj, version = 0) {
  return makeGraph('', obj, version).children;
}

export function page(obj, key = '', end = '\uffff') {
  return (outerKey, version) => ({
    key: outerKey,
    version,
    children: merge([{ key, end, version }], graph(obj, version)),
  });
}

export function link(path) {
  path = makePath(path);
  return (key, version) => ({ key, version, path });
}
