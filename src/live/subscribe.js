import { merge, slice } from '@graffy/struct';
import stream from '@graffy/stream';

export default function subscribe(store, originalQuery, raw) {
  let push, end;
  let upstream;
  let query = [];
  let data = [];
  let payload = [];

  resubscribe(originalQuery);

  return new stream((streamPush, streamEnd) => {
    push = streamPush;
    end = streamEnd;
    return unsubscribe;
  });

  async function resubscribe(unknown, _extraneous) {
    if (upstream) upstream.return(); // Close the stream.

    // TODO: Remove extraneous parts of the query.
    query.push(...unknown);

    try {
      upstream = store.sub(query);
      const value = await upstream.next();
      const initial = await store.get(unknown);
      if (value) merge(initial, value);
      putValue(initial);
    } catch (e) {
      error(e);
    }
    putStream(upstream);
  }

  async function putStream(stream) {
    // TODO: Backpressure: pause pulling if downstream listener is saturated.
    try {
      for await (const value of stream) putValue(value);
    } catch (e) {
      error(e);
    }
  }

  function putValue(value) {
    if (typeof value !== 'undefined') {
      merge(data, value);
      if (raw) merge(payload, value);
    }
    const { known, unknown, extraneous } = slice(data, originalQuery);
    data = known;

    if (!unknown) {
      if (raw) {
        push(payload);
        payload = [];
      } else {
        push(data);
      }
    }

    if (unknown || extraneous) resubscribe(unknown, extraneous);
  }

  function error(e) {
    // eslint-disable-next-line no-console
    console.error('subscribe', e);
    end(e);
    unsubscribe();
  }

  function unsubscribe() {
    if (upstream) upstream.return();
  }
}
