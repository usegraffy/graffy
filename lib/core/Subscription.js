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
    // let data = await this.data;
    // console.log('Initial', data);
    this.push(prune(await this.data, this.shape, this.path));
  }

  async pub(change) {
    if (!overlaps(this.shape, change)) return;
    let payload;
    if (this.options.values) {
      payload = this.data = this.options.resolve(this.shape, immerge(await this.data, change));
    } else {
      payload = this.options.resolve(this.shape, change);
    }
    this.push(prune(await payload, this.shape, this.path));
  }
}
