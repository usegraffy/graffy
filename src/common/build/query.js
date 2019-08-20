const MAX_PAGE_SIZE = 4096;

function pageToRange(page) {
  const node = {};
  node.key = page.after || '';
  node.end = page.before || '\uffff';
  node.count = page.first || -page.last || MAX_PAGE_SIZE;
  return node;
}

// We freeze constructed queries to guard against bugs that might mutate them.
// TODO: Don't freeze in production builds, as a perf optimization.
const freeze = obj => Object.freeze(obj);

function makeQuery(value, version) {
  if (Array.isArray(value)) {
    return freeze({
      children: freeze([
        freeze({
          ...pageToRange(value[0]),
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
          .map(key => freeze({ key, ...makeQuery(value[key], version) })),
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
