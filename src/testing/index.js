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

export const keyref = ($key, $ref, obj = {}) => {
  obj.$key = $key;
  ref($ref, obj);
  return obj;
};
