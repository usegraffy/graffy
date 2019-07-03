import { merge, slice, sieve } from '@graffy/struct';
import stream from '@graffy/stream';

const debug = (graph = [], indent = '') =>
  '\n' +
  graph
    .map(({ key, end, clock, children, ...props }) =>
      [
        indent,
        key,
        end ? `..${end}` : '',
        ` ${clock} { `,
        Object.keys(props)
          .map(key => `${key}:${JSON.stringify(props[key])}`)
          .join(' '),
        children ? debug(children, indent + '  ') : '',
        ' }',
      ].join(''),
    )
    .join('\n');

export default function subscribe(store, originalQuery, raw) {
  let push, end;
  let upstream;
  let query = [];
  let data = [];
  let payload = [];

  resubscribe(originalQuery);

  return new stream((streamPush, streamEnd) => {
    push = v => {
      console.log('Push', debug(v));
      streamPush(v);
    };
    end = streamEnd;
    return unsubscribe;
  });

  async function resubscribe(unknown, _extraneous) {
    if (upstream) upstream.return(); // Close the stream.

    // TODO: Remove extraneous parts of the query.
    query.push(...unknown);

    console.log('Resubscribing', debug(query));

    try {
      upstream = store.sub(query, { skipFill: true });
      const { value } = await upstream.next();
      if (value) unknown = slice(value, unknown).unknown;
      // if (done) throw Error('upstream.earlyend');
      console.log('Fetching unknown', debug(value), debug(unknown));
      if (!unknown) {
        putValue(value);
      } else {
        const initial = await store.get(unknown, { skipFill: true });
        if (value) merge(initial, value);
        putValue(initial);
      }
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
    console.log('PutChange', change && debug(change));

    if (typeof change !== 'undefined') merge(payload, sieve(data, change));

    console.log('After sieve', debug(data));

    let { known, unknown, extraneous } = slice(data, originalQuery);
    data = known;

    // console.log('After slice', debug(data), unknown && debug(unknown));

    if (unknown) {
      const changeParts = slice(change, unknown);
      if (changeParts.known) {
        merge(data, changeParts.known);
        merge(payload, changeParts.known);
        unknown = changeParts.unknown;
      }
    }

    // This is not an else; previous block might update unknown.
    if (!unknown && payload.length) {
      push(payload);
      payload = [];
    }

    if (unknown || extraneous) resubscribe(unknown, extraneous);
  }

  function putValue(value) {
    console.log('PutValue', debug(value));

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
