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

export function errIf(message, condition) {
  if (condition) err(message);
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
