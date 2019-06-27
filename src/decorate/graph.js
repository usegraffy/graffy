import { merge } from '@graffy/struct';

function makeGraph(value, clock) {
  if (typeof value === 'function') {
    // This is a page or a link waiting for a clock.
    return value(clock);
  } else if (Array.isArray(value)) {
    // This has already been converted to a CRDT graph
    return { clock, children: value };
  } else if (typeof value === 'object' && value) {
    return {
      clock,
      children: Object.keys(value)
        .sort()
        .map(key => ({ key, ...makeGraph(value[key], clock) })),
    };
  } else {
    return { clock, value };
  }
}

export function graph(obj, clock) {
  return makeGraph(obj, clock).children;
}

export function page(obj, key = '', end = '\uffff') {
  return clock => ({
    clock,
    children: merge([{ key, end, clock }], graph(obj, clock)),
  });
}

export function link(path) {
  return clock => ({ clock, path });
}
