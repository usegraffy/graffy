import { immerge, prune, overlaps, makeStream } from '../util';

export default class Subscription {
  constructor(shape, path, options) {
    this.shape = shape;
    this.path = path;
    this.options = options;

    this.data = this.options.resolve(this.shape);
    this.stream = makeStream(push => {
      this.push = push;
      return options.onClose;
    });

    this.init();
  }

  async init() {
    // We need this line to be a separate function because the
    // constructor can't be async. We're okay even if pub is
    // called before this happens.
    this.push(prune(await this.data, this.shape, this.path));
  }

  async pub(change) {
    const { shape, path, options, data } = this;
    if (!overlaps(shape, change)) return;
    let payload;
    if (options.values) {
      payload = this.data = options.resolve(shape, immerge(await data, change));
    } else {
      payload = options.resolve(shape, change);
    }
    this.push(prune(await payload, shape, path, !!options.keepLinks));
  }
}
