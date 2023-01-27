export { default as mockBackend } from './mockBackend.js';
export { default as pretty } from './pretty.js';

/** @param {boolean | any} $put */
export const put = (obj, $put = true) => {
  Object.defineProperty(obj, '$put', { value: $put });
  return obj;
};

export const ref = ($ref, obj = {}) => {
  Object.defineProperty(obj, '$ref', { value: $ref });
  return obj;
};

/** @param {string} $key */
export const key = ($key, obj = {}) => {
  obj.$key = $key;
  return obj;
};

export const keyref = ($key, $ref, obj = {}) => {
  return ref($ref, key($key, obj));
};

/**
 * @typedef {Record<string,any>} RangeArgs
 * @typedef {any[] & {$page?: RangeArgs, $prev?: RangeArgs, $next?: RangeArgs}} RangeResult
 * @param {RangeArgs} $page
 * @param {number} size
 * @param {RangeResult} obj
 * @returns RangeResult;
 */
export const page = ($page, size, obj = []) => {
  const { $first, $last, $all, $after, $since, $before, $until, ...filter } =
    $page;
  obj.$page = $page;
  obj.$next = $before
    ? { ...filter, $last: size, $since: $before }
    : $until
    ? { ...filter, $first: size, $after: $until }
    : null;
  obj.$prev = $after
    ? { ...filter, $last: size, $until: $after }
    : $since
    ? { ...filter, $last: size, $before: $since }
    : null;
  return obj;
};
