import {
  sprout,
  prune,
  graft,
  strike,
  merge,
  getToken,
  makeStream,
} from '@graffy/common';

export default async function subscribe(query, options) {
  let earlyChange = {};
  let push;
  const [token, signal] = getToken();
  let data = await options.resolve(query);
  merge(data, earlyChange);

  // TODO: Properly resolve, prune etc. after early changes are merged.

  earlyChange = null;
  data = prune(data, query) || {};
  push(data);

  // Pub is called by providers to publish a change.
  const pub = async change => {
    if (earlyChange) {
      merge(earlyChange, change);
      return;
    }

    // Returns early if the change does not have any overlap with the query.
    // DO NOT prune the change to only those changes that overlap; when the
    // overlapping portion includes a deletion in a range, the change set
    // may contain additional items to make up.
    if (!prune(change, strike(data, query))) return;

    merge(data, change);

    const nextQuery = sprout(data, query);

    if (nextQuery) {
      const linked = await options.resolve(nextQuery);
      merge(data, linked);
      if (!options.values) merge(change, linked);
    }
    data = prune(data, query);
    push(options.values ? graft(data, query) || {} : change);
  };

  // Create and return an Async Iterable.
  return makeStream(iterPush => {
    push = iterPush;
    return signal;
  });
}

// const id = this.subId++;
// const resolveOptions = { token };
// const sub = new Subscription(query, {
//   values: !options.raw,
//   resolve: query =>
//     resolve(this.funcs, GET, query, resolveOptions).then(result =>
//       cap(result, query),
//     ),
//   onClose: () => {
//     signal();
//     delete this.subs[id];
//   },
// });
// this.subs[id] = sub;
// return sub.stream;

class Subscription {
  constructor(query, options) {
    this.query = query;
    this.options = options;

    this.stream = makeStream(push => {
      this.push = push;
      return options.onClose;
    });

    this.earlyChange = {};

    this.init();
  }

  async init() {
    // We need this line to be a separate function because the
    // constructor can't be async. We're okay even if pub is
    // called before this happens.
    const { options, query } = this;
    let data = await options.resolve(query);
    merge(data, this.earlyChange);

    // TODO: Properly resolve, prune etc. after early changes are merged.

    delete this.earlyChange;
    this.data = data = prune(data, query) || {};
    this.push(options.values ? graft(data, query) || {} : data);
  }

  async pub(change) {
    if (this.earlyChange) {
      merge(this.earlyChanges, change);
      return;
    }
    const { query, options, data } = this;

    // Returns early if the change does not have any overlap with the query.
    // DO NOT prune the change to only those changes that overlap; when the
    // overlapping portion includes a deletion in a range, the change set
    // may contain additional items to make up.
    if (!prune(change, strike(data, query))) return;

    merge(data, change);

    const nextQuery = sprout(data, query);

    if (nextQuery) {
      const linked = await options.resolve(nextQuery);
      merge(data, linked);
      if (!options.values) merge(change, linked);
    }
    this.data = prune(data, query);
    this.push(options.values ? graft(this.data, query) || {} : change);
  }
}
