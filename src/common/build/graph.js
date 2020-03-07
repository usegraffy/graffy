import { merge } from '../graph';
import { makePath } from '../path';
import { isRange } from '../node';

function makeGraph(key, value, version) {
  if (typeof value === 'function') {
    // This is a page or a link waiting for a version.
    return value(key, version);
  } else if (Array.isArray(value)) {
    // console.warn('makeGraph: Unnecessary call with', value);
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

export function graph(obj, version = Date.now()) {
  // console.log('makeGraph called with', obj);
  if (!obj) return obj;
  return makeGraph('', obj, version).children;
}

export function page(obj, key = '', end = '\uffff') {
  return (outerKey, version) => {
    const nodes = graph(obj, version);
    const gaps = merge(
      [{ key, end, version }],
      Object.keys(obj).map(key => ({ key, value: 1, version })),
    ).filter(node => isRange(node));
    const children = merge(nodes, gaps);

    return { key: outerKey, version, children };
  };
}

export function link(rawPath) {
  const path = makePath(rawPath);
  return (key, version) => ({ key, version, path });
}
