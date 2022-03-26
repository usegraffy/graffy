import util from 'util';
import { encodeKey, keyAfter, keyBefore } from '@graffy/common';
import { isEmpty } from './common.js';

const IS_NODE = Symbol();

function copyProps(target, source) {
  for (const prop in source) {
    if (typeof source[prop] !== 'undefined') target[prop] = source[prop];
  }
}

function makeNode(props) {
  const leaf = (...children) => {
    if (children.length === 1 && !children[0]?.[IS_NODE]) {
      leaf.value = children[0];
      return leaf;
    }
    const branch = [...children].sort((a, b) => (a.key < b.key ? -1 : 1));
    copyProps(branch, props);
    Object.defineProperty(branch, IS_NODE, { value: true });
    branch[util.inspect.custom] = () =>
      `${branch.key} ${util.inspect(branch.slice(0))}`;

    return branch;
  };
  copyProps(leaf, props);
  leaf.value = 1;
  Object.defineProperty(leaf, IS_NODE, { value: true });
  leaf[util.inspect.custom] = () => `${leaf.key} = ${leaf.value}`;

  return leaf;
}

export const q = new Proxy(function () {}, {
  get: (_target, key) => makeNode({ key }),
  apply: (
    _target,
    _thisObject,
    [{ first, last, after, before, since, until, ...params }],
  ) => {
    let key = '';
    let end = '\uffff';

    if (typeof after !== 'undefined') key = keyAfter(encodeKey(after));
    if (typeof before !== 'undefined') key = keyBefore(encodeKey(before));
    if (typeof since !== 'undefined') key = encodeKey(since);
    if (typeof until !== 'undefined') key = encodeKey(until);

    if (last) [key, end] = [end, key];
    if (!isEmpty(params)) {
      const prefix = encodeKey(params) + '.';
      key = prefix + key;
      end = prefix + end;
    }
    const count = first || last;
    return makeNode({ key, end, count });
  },
});

export const g = q;
export const _ = q;
