import merge from 'lodash.merge';

import AsyncIterator from './AsyncIterator';
import { getNode, makeNode, makePath, wrap } from '../util';

const TAP = Symbol();

export default class Cache {
  constructor() {
    this.taps = {};
    this.data = {};
  }

  get(path) {
    path = makePath(path);
    return wrap(getNode(this.data, path), path);
  }

  put(path, data) {
    path = makePath(path);
    const node = makeNode(this.data, path);
    merge(node, data);
  }

  /*
    ??? Is typing a dependency for taps through links?
  */

  tap(path) {
    path = makePath(path);
    return new AsyncIterator(next => {
      const node = makeNode(this.taps, path);
      const arr = node[TAP] = node[TAP] || [];
      arr.push(next);
      return () => {
        const ix = arr.indexOf(next);
        if (ix >= 0) arr.splice(ix, 1);
      };
    });
  }
}
