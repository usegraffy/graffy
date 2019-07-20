const MAX_PAGE_SIZE = 4096;

function pageToRange(page) {
  const node = {};
  node.key = page.after || '';
  node.end = page.before || '\uffff';
  node.count = page.first || -page.last || MAX_PAGE_SIZE;
  return node;
}

function makeQuery(value, clock) {
  if (Array.isArray(value)) {
    return {
      children: [{ ...pageToRange(value[0]), ...makeQuery(value[1], clock) }],
      clock,
    };
  } else if (typeof value === 'object' && value) {
    return {
      clock,
      children: Object.keys(value)
        .sort()
        .map(key => ({ key, ...makeQuery(value[key], clock) })),
    };
  } else {
    return { clock, value: typeof value === 'number' ? value : 1 };
  }
}

export function query(obj, clock = 0) {
  return makeQuery(obj, clock).children;
}
