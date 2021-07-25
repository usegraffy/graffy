import util from 'util';

const opts = {
  showHidden: false,
  depth: 3,
  colors: false,
  customInspect: true,
  showProxy: false,
  maxArrayLength: 3,
  maxStringLength: 10,
  breakLength: Infinity,
  compact: true,
  sorted: false,
  getters: false,
};

export function err(message, { cause, ...args } = {}) {
  const e = new Error(message + (args ? ' ' + util.inspect(args, opts) : ''));
  e.cause = cause;
  throw e;
}

export function errIf(message, condition, args) {
  if (condition) err(message, args);
}

export function isEmpty(object) {
  for (const _ in object) return false;
  return true;
}

export function isDef(value) {
  return typeof value !== 'undefined';
}

export function isPlainObject(arg) {
  return typeof arg === 'object' && arg && !Array.isArray(arg);
}

export function isEncodedKey(str) {
  return str[0] === '\0';
}

export function find(items, compare, first = 0, last = items.length) {
  let currentFirst = first;
  let currentLast = last;
  while (currentFirst < currentLast) {
    // console.log(currentFirst, currentLast);
    const ix = ((currentFirst + currentLast) / 2) | 0;
    const d = compare(items[ix]);
    // console.log(ix, items[ix], d);

    if (d < 0) {
      currentFirst = ix + 1;
    } else if (d > 0) {
      currentLast = ix;
    } else {
      return ix;
    }
  }

  return currentFirst;
}
