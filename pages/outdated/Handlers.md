# Watch Handlers

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

If an event log (e.g. Kafka) is available, it's more efficient to poll it instead. Note that in this case, as it's possible that there are no relevant events for a while after the the watch handler is called; it's necessary to `yield` undefined at the start to signal that the subscription is ready.

```js
onWatch('users', async function*(query) {
  yield;
  while (true) {
    const events = getEventsSinceLastOffset();
    for (const event of events) yield event;
    await sleep(POLL_INTERVAL);
  }
});
```

If the data source supports it, push should be preferred for low-frequency changes. This requires starting and stopping upstream listeners, whihc the `makeStream` helper makes more ergonomic.

```js
import { makeStream } from '@graffy/common';

onWatch('users', (query, options) => {
  const [stream, push] = makeStream();
  startUpstreamSubscription(event => push(event));
  options.onEnd(() => stopUpstreamSubscription());
  return stream;
});
```
