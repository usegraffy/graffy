import { merge, prune, overlaps, makeStream } from '../util';

export class Subscription {
  constructor(shape, path, options) {
    this.shape = shape;
    this.path = path;
    this.options = options;

    this.data = null;
    this.stream = makeStream(push => {
      this.push = push;
      return options.onClose;
    });
  }

  async pub(change) {
    if (!overlaps(this.shape, change)) return;
    let payload;
    if (this.options.values) {
      payload = this.data = this.options.resolve(this.shape, merge(this.data, change));
    } else {
      payload = this.options.resolve(this.shape, change);
    }
    this.push(prune(payload, this.shape, this.path));
  }
}
