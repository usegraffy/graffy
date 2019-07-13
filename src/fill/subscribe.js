import { merge, slice, sieve, add } from '@graffy/struct';
import stream from '@graffy/stream';
import { debug } from '@graffy/testing';

export default function subscribe(store, originalQuery, raw) {
  let push, end;
  let upstream;
  let query = [];
  let data = [];
  let payload = [];

  resubscribe(originalQuery);

  return stream((streamPush, streamEnd) => {
    push = v => {
      // console.log('Push', debug(v));
      streamPush(v);
    };
    end = streamEnd;
    return unsubscribe;
  });

  async function resubscribe(unknown, _extraneous) {
    try {
      const changed = add(query, unknown);
      // console.log('Resubscribe', debug(unknown), changed);
      if (!changed) return;

      if (upstream) upstream.return(); // Close the existing stream.
      upstream = store.sub(query, { skipFill: true });

      let { value } = await upstream.next();
      // console.log('Got first subscription value', value);

      if (typeof value === 'undefined') {
        // The upstream is a change subscription, not a live query,
        // so we need to fetch the initial value.

        // TODO: Get a clock corresponding to the subscription's start
        // and verify that the store.get() response is newer.
        // console.log('Making query for ', debug(unknown));
        value = await store.get(unknown, { skipFill: true });
        // console.log('Got query result', debug(value));
        value = slice(value, unknown).known;
      }
      putValue(value, false);
    } catch (e) {
      error(e);
    }
    putStream(upstream);
  }

  async function putStream(stream) {
    // TODO: Backpressure: pause pulling if downstream listener is saturated.
    try {
      for await (const value of stream) putValue(value, true);
    } catch (e) {
      error(e);
    }
  }

  function putValue(value, isChange) {
    if (typeof value === 'undefined') return;
    // console.log('PutValue', debug(value), data && debug(data));

    if (isChange) {
      const sieved = sieve(data, value);
      // console.log('After sieve', debug(sieved), debug(data));
      if (!sieved.length) return;
      merge(payload, sieved);
    } else {
      merge(data, value);
      // console.log('Payload before adding value', debug(payload));
      if (raw) merge(payload, value);
      // console.log('Payload after adding value');
    }

    let { known, unknown, extraneous } = slice(data, originalQuery);
    data = known;

    // console.log('After slice', debug(data), unknown && debug(unknown));
    // console.log('Payload and value', debug(payload), value && debug(value));

    if (isChange && value && unknown) {
      // The sieve may have removed some necessary data (that we weren't aware
      // was necessary). Get it back.

      // console.log('Here');
      const valueParts = slice(value, unknown);
      if (valueParts.known) {
        merge(data, valueParts.known);
        if (raw) merge(payload, valueParts.known);
        unknown = valueParts.unknown;
      }
    }

    // This is not an else; previous block might update unknown.
    if (!unknown) {
      // console.log('Pushing', payload);
      if (raw) {
        push(payload);
      } else {
        push(data);
      }
      payload = [];
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
