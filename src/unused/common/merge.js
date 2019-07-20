import mergeWith from 'lodash/mergeWith';
import { LINK_KEY, PAGE_KEY } from './constants';
import { union } from './interval';

function atomicArrays(objValue, srcValue, key) {
  if (Array.isArray(objValue) || Array.isArray(srcValue)) {
    if (key === LINK_KEY) return srcValue;
    if (key === PAGE_KEY) return union(objValue || [], srcValue);
    throw Error('merge.unexpected_array');
  }
}

export default function merge(...args) {
  return mergeWith(...args, atomicArrays);
}
