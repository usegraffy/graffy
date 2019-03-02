import { getNode, makeNode, makePath, wrap, merge } from '@grue/common';

export default class Cache {
  constructor() {
    this.data = {};
  }

  init(grue) {
    grue.onGet(this.get);
    grue.onPut(this.put);
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
