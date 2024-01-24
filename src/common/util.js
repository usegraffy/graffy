import debug from 'debug';

const log = debug('graffy');

export const MIN_KEY = new Uint8Array();
export const MAX_KEY = new Uint8Array([0xff]);

export function isMinKey(key) {
  return key.length === 0;
}

export function isMaxKey(key) {
  return key.length === 1 && key[0] === 0xff;
}

export function err(message, { cause = null, ...args } = {}) {
  const e = new Error(message + (args ? ` ${JSON.stringify(args)}` : ''));
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
  return (
    typeof arg === 'object' &&
    arg &&
    !Array.isArray(arg) &&
    !ArrayBuffer.isView(arg)
  );
}

export function clone(obj) {
  if (Array.isArray(obj)) {
    return obj.slice(0);
  }
  return { ...obj };
}

export function cmp(a, b) {
  const l = a.length < b.length ? a.length : b.length;
  for (let i = 0; i < l; i++) {
    if (a[i] < b[i]) return -1;
    if (a[i] > b[i]) return 1;
  }
  if (a.length < b.length) return -1;
  if (a.length > b.length) return 1;
  return 0;
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

const stringifyDescriptor = {
  value: function () {
    if (this?.length === 0) return '\u00b7';
    let str = '';
    let bull = false;

    this?.forEach?.((value, i) => {
      if (value >= 32 && value <= 126) {
        str += String.fromCharCode(value);
        bull = true;
      } else {
        str +=
          (bull ? '\u00b7' : '') +
          `0${value.toString(16)}`.slice(-2) +
          (i < this.length - 1 ? '\u00b7' : '');
        bull = false;
      }
    });
    return str;
  },
};

const inspectSymbol = Symbol.for('nodejs.util.inspect.custom');

export function addStringify(buffer) {
  if (!log.enabled) return buffer;
  if ('toJSON' in buffer || inspectSymbol in buffer) {
    return buffer;
  }
  Object.defineProperties(buffer, {
    toJSON: stringifyDescriptor,
    toString: stringifyDescriptor,
    [inspectSymbol]: stringifyDescriptor,
  });
  return buffer;
}

addStringify(MIN_KEY);
addStringify(MAX_KEY);
