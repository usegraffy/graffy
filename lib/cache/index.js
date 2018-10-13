import merge from 'lodash.merge';

import AsyncIterator from './AsyncIterator';
import { getNode, makeNode, makePath, wrap } from '../util';

const SUB = Symbol();

export default class Cache {
  constructor() {
    this.subs = {};
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
    ??? Is typing a dependency for subs through links?
  */

  sub(path) {
    path = makePath(path);
    return new AsyncIterator(next => {
      const node = makeNode(this.subs, path);
      const arr = node[SUB] = node[SUB] || [];
      arr.push(next);
      return () => {
        const ix = arr.indexOf(next);
        if (ix >= 0) arr.splice(ix, 1);
      };
    });
  }
}
