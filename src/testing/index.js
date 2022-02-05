export { default as mockBackend } from './mockBackend.js';
export { default as format, inspect } from './format.js';
export { default as pretty } from './pretty.js';

export const put = (obj) => {
  Object.defineProperty(obj, '$put', { value: true });
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
