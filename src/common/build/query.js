import { key } from '../encode';
import { keyBefore, keyAfter } from '../graph';

const FALLBACK_PAGE_SIZE = 4096;

function pageToRange(page) {
  const node = {};
  node.key = typeof page.after !== 'undefined' ? key(page.after) : '';
  node.end = typeof page.before !== 'undefined' ? key(page.before) : '\uffff';
  node.count = page.first || -page.last || FALLBACK_PAGE_SIZE;
  if (page.excludeAfter) node.key = keyAfter(node.key);
  if (page.excludeBefore) node.end = keyBefore(node.end);
  return node;
}

// We freeze constructed queries to guard against bugs that might mutate them.
// TODO: Don't freeze in production builds, as a perf optimization.
const freeze = (obj) => Object.freeze(obj);

function makeQuery(value, version) {
  if (Array.isArray(value)) {
    if (value.length === 1) value.unshift({});
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
