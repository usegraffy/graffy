# Streams

Graffy's `.watch()` API returns ES2018 AsyncIterable objects, or _streams_, that can be used in `for await`.

```js
for await (const result of store.watch(query)) {
  /* Each iteration has an updated value of result. */
}
```

## Stream types

Graffy has three types of streams:

- **Value streams** yield a full query result immediately and every time a change occurs. By default, `store.watch()` returns a value stream, as seen in the example above.
- **Live streams** yield a full query result immediately, and then change objects whenever they occur. Server to client push uses live streams, by passing the `raw` option to `store.watch()`
- **Change streams** never yield a full query result; they only yield change objects, whenever they occur.

## onWatch providers

`.onWatch()` providers may return any of the three stream types, and Graffy can convert it to the type of stream requested by the client. The provider might create a stream using an AsyncGenerator function (`async function*`) but we recommend using a library like `graffy/stream` for more control over the lifecycle.

If a provider is returning a change stream, it **MUST** yield an `undefined` as its first value, to signal to Graffy that it is a change stream and that it is ready.

Here are some example `onWatch` providers:

### Polling

One simple (albeit inefficient) way to implement watches is by polling the required data itself:

```js
onWatch('users', async function*(query) {
  const userIds = Object.keys(query);
  while (true) {
    yield getUsers(userIds);
    await sleep(POLL_INTERVAL);
  }
});
```

This provider returns a value stream.

In practice, you would never do this, as Graffy can be configured to do the polling itself.

### Pull-based

If a pull-based event log (e.g. Kafka) is available, it's more efficient to poll it instead.

```js
onWatch('users', async function*(query) {
  yield; // Signal that change stream is ready
  while (true) {
    const events = getEventsSinceLastOffset();
    for (const event of events) yield event;
    await sleep(POLL_INTERVAL);
  }
});
```

This returns a change stream; note the `yield;` on the second line, which tells Graffy that this is a change stream, and that the stream has been initialized.

### Push-based

If the data source supports it, push should be preferred for low-frequency changes. This requires starting and stopping upstream listeners, which can't be done using the `async function*` syntax but can be done using the `makeStream` helper.

```js
import makeStream from '@graffy/stream';

onWatch('users', query =>
  makeStream(push => {
    const socket = openSocketToUpstream();
    socket.on('open', () => push());
    socket.on('message', message => push(JSON.parse(message)));
    return () => socket.close();
  }),
);
```

This, too, returns a change stream - note the `push()` on socket open, which tells Graffy that this is a change stream, and that the stream has been initialized.
