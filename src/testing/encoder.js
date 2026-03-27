import { addStringify, encodeValue } from '../common';

/** @type {Record<string, any>} */
export const e = new Proxy(
  {},
  { get: (_target, prop) => addStringify(encodeValue(prop)) },
);
