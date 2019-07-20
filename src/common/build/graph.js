import { merge } from '../graph';

function makeGraph(key, value, clock) {
  if (typeof value === 'function') {
    // This is a page or a link waiting for a clock.
    return value(key, clock);
  } else if (Array.isArray(value)) {
    // This has already been converted to a CRDT graph
    return { key, clock, children: value };
  } else if (value === null) {
    // This is a single key known to be missing.
    return { key, end: key, clock };
  } else if (typeof value === 'object' && value) {
    return {
      key,
      clock,
      children: Object.keys(value)
        .sort()
        .map(k => makeGraph(k, value[k], clock)),
    };
  } else {
    return { key, clock, value };
  }
}

export function graph(obj, clock = 0) {
  return makeGraph('', obj, clock).children;
}

export function page(obj, key = '', end = '\uffff') {
  return (outerKey, clock) => ({
    key: outerKey,
    clock,
    children: merge([{ key, end, clock }], graph(obj, clock)),
  });
}

export function link(path) {
  return (key, clock) => ({ key, clock, path });
}
