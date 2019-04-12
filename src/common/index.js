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

export { default as compose } from './compose';
export { LINK_KEY, PAGE_KEY } from './constants';
export { default as getToken } from './getToken';
export { default as merge } from './merge';
export { isRange, encRange, decRange, splitRange } from './range';
export { default as resolve } from './resolve';
export { graft } from './tree';
export { default as makeStream } from './makeStream';
export { default as mergeStreams } from './mergeStreams';
export { addQueries, subtractQueries, simplifyQuery } from './queryOperations';
export { linkKnown, hasKnown, getKnown, getUnknown } from './cacheOperations';

export function diff(changes) {
  return changes;
}
