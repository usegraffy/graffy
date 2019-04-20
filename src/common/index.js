export {
  getLink,
  getPage,
  makeLink,
  makePage,
  makePath,
  unwrap,
  makeNode,
  wrap,
} from './path';

export { LINK_KEY, PAGE_KEY } from './constants';
export { default as getToken } from './getToken';
export { default as merge } from './merge';
export { isRange, encRange, decRange, splitRange } from './range';
export { graft } from './tree';
export { default as makeStream } from './makeStream';
export { default as mergeStreams } from './mergeStreams';
export { addQueries, subtractQueries, simplifyQuery } from './queryOperations';
export {
  linkKnown,
  hasKnown,
  getKnown,
  getMaxKnown,
  getUnknown,
} from './cacheOperations';

export function diff(changes) {
  return changes;
}
