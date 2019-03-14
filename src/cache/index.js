import { getNode, makeNode, makePath, wrap, merge } from '@graffy/core';

export default class Cache {
  constructor() {
    this.data = {};
  }

  init(graffy) {
    graffy.onGet(this.get);
    graffy.onPut(this.put);
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
}
