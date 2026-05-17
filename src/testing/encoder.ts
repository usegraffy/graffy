import { addStringify, encodeValue } from '../common/index.ts';

export const e = new Proxy({} as Record<string, Uint8Array>, {
  get: (_target, prop) => addStringify(encodeValue(prop as string)),
}) as Record<string, Uint8Array>;
