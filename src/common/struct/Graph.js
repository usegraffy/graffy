import merge from './merge';

export default class Graph {
  constructor(data) {
    this.data = [];
    this.put(data);
  }

  put(changes) {
    return merge(this.data, changes);
  }

  get(/* query */) {}
}
