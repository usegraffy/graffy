import { merge, slice, sieve } from '@graffy/struct';
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
      upstream = store.sub(query, { skipLive: true });
      const { value } = await upstream.next();
      // if (done) throw Error('upstream.earlyend');
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
    const consume = raw ? putChange : putValue;
    try {
      for await (const value of stream) consume(value);
    } catch (e) {
      error(e);
    }
  }

  function putChange(change) {
    console.log('PutChange', JSON.stringify(change));

    if (typeof change !== 'undefined') merge(payload, sieve(data, change));

    let { known, unknown, extraneous } = slice(data, originalQuery);
    data = known;

    if (unknown) {
      const changeParts = slice(change, unknown);
      if (changeParts.known) {
        merge(data, changeParts.known);
        merge(payload, changeParts.known);
        unknown = changeParts.unknown;
      }
    }

    // This is not an else; previous block might update unknown.
    if (!unknown) {
      push(payload);
      payload = [];
    }

    if (unknown || extraneous) resubscribe(unknown, extraneous);
  }

  function putValue(value) {
    console.log('PutValue', JSON.stringify(value));

    if (typeof value !== 'undefined') merge(data, value);

    const { known, unknown, extraneous } = slice(data, originalQuery);
    data = known;

    if (!unknown) push(data);

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
