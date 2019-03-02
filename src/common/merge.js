import mergeWith from 'lodash/mergeWith';

function atomicArrays(objValue, srcValue) {
  if (Array.isArray(objValue) || Array.isArray(srcValue)) return srcValue;
}

export default function(...args) {
  return mergeWith(...args, atomicArrays);
}
