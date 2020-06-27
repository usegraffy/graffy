import { merge, slice, sieve, add, finalize } from '@graffy/common';
import { makeStream } from '@graffy/stream';
import debug from 'debug';
import { format } from '@graffy/testing';

const log = debug('graffy:fill:subscribe');

export default function subscribe(store, originalQuery, { raw }) {
  const empty = () => finalize([], originalQuery, 0);
  let push, end;
  let upstream;
  let query = [];
  let data = empty();
  let payload = [];

  const stream = makeStream((streamPush, streamEnd) => {
    push = (v) => {
      log('Push', format(v));
      streamPush(v);
    };
    end = streamEnd;
    return unsubscribe;
  });

  resubscribe(originalQuery);

  return stream;

  async function resubscribe(unknown) {
    try {
      const changed = add(query, unknown);
      log(changed ? 'Resubscribing' : 'Not resubscribing', format(unknown));
      if (!changed) return;

      if (upstream) upstream.return(); // Close the existing stream.
      upstream = store.call('watch', query, { skipFill: true });

      let { value } = await upstream.next();
      log('First payload', typeof value);

      if (typeof value === 'undefined') {
        // The upstream is a change subscription, not a live query,
        // so we need to fetch the initial value.

        // TODO: Get a version corresponding to the subscription's start
        // and verify that the store.read response is newer.
        value = await store.call('read', unknown, { skipCache: true });
        log('Read initial value', typeof value);
      }
      // value = value && slice(value, unknown).known;
      putValue(value, false);
    } catch (e) {
      log('resubscribe error', e);
      error(e);
    }
    putStream(upstream);
  }

  async function putStream(stream) {
    // TODO: Backpressure: pause pulling if downstream listener is saturated.
    log('Start putting stream');
    try {
      for await (const value of stream) putValue(value, true);
    } catch (e) {
      error(e);
    }
  }

  function putValue(value, isChange) {
    if (typeof value === 'undefined') return;
    log('Put', isChange ? 'Change' : 'Value', typeof value);

    if (value === null) {
      // No results exist at this moment.
      data = empty();
      push(null);
      return;
    }

    // We do this to ensure that everything in value gets incorporated
    // into data, even as we use sieve to ensure only actual changes are
    // added to payload.
    // if (!isChange) merge(data, [{ key: '', end: '\uffff', version: -1 }]);

    // log('Data before sieve', format(data));

    let sieved;
    if (isChange) {
      sieved = sieve(data, value);
    } else {
      sieved = slice(value, query).known;
      if (sieved) merge(data, sieved);
    }
    log('Sieved: ', sieved && format(sieved));

    if (raw && sieved) {
      // log('Payload before adding sieved', format(payload));
      merge(payload, sieved);
      // log('Payload after adding sieved', format(payload));
    }

    // The new value might have removed a link, making parts of
    // data unnecessary, or added a link, introducing
    // new data requirements. Let's find out.

    let { known, unknown } = slice(data, originalQuery);
    data = known || empty();

    log('Data and unknown', format(data), unknown && format(unknown));
    log('Payload and value', format(payload), value && format(value));

    if (isChange && value && unknown) {
      // The sieve may have removed some necessary data (that we weren't aware
      // was necessary). Get it back.

      const valueParts = slice(value, unknown);
      if (valueParts.known) {
        merge(data, valueParts.known);
        if (raw) merge(payload, valueParts.known);
        unknown = valueParts.unknown;
      }
    }

    if (unknown) return resubscribe(unknown);

    if (!raw) {
      if (!isChange || (sieved && sieved.length)) push(data);
    } else if (payload.length) {
      push(payload);
      payload = [];
    }
  }

  function error(e) {
    if (end) end(e);
    unsubscribe();
  }

  function unsubscribe() {
    if (upstream) upstream.return();
  }
}
