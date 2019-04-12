import {
  getUnknown,
  getKnown,
  graft,
  linkKnown,
  merge,
  getToken,
  makeStream,
} from '@graffy/common';

export default function(store) {
  const pubs = {};
  let lastWatchId = 0;

  store.onGet(async (query, options, next) => {
    if (options.once || options.watch || options.fetch) {
      return next(query, options);
    }

    let earlyChange = {};
    const id = lastWatchId++;
    const [watch, signal] = getToken();
    const [push, stream] = makeStream(() => {
      // This function is ccalled when the stream is closed
      delete pubs[id];
      signal();
    });
    options = { ...options, watch };

    let data;

    // Pub is called by providers to publish a change.
    pubs[id] = async change => {
      if (earlyChange) {
        merge(earlyChange, change);
        return;
      }

      // Returns early if the change does not have any overlap with the query.
      // DO NOT getKnown the change to only those changes that overlap; when the
      // overlapping portion includes a deletion in a range, the change set
      // may contain additional items to make up.
      if (!getKnown(change, linkKnown(data, query))) return;

      merge(data, change);

      const nextQuery = getUnknown(data, query);

      if (nextQuery) {
        const linked = await store.get(nextQuery, options);
        merge(data, linked);
        if (!options.values) merge(change, linked);
      }
      data = getKnown(data, query);
      push(options.values ? graft(data, query) || {} : change);
    };

    data = await next(query, options);
    merge(data, earlyChange);

    // TODO: Properly resolve, getKnown etc. after early changes are merged.

    earlyChange = null;
    data = getKnown(data, query) || {};
    push(data);

    return stream;
  });

  store.onPut((change, options) => {});
}
