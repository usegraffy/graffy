import { encodeValue } from '../graffy/common';

/** @type {Record<string, any>} */
export const e = new Proxy({}, { get: (_target, prop) => encodeValue(prop) });
