# Graffy Stream

Utility for creating AsyncIterables (streams) from any callback-based
event source.

## Why?

Many JS APIs provide callback-based event emitters that must be subscribed to and unsubscribed from. The async generator syntax in JS does not provide an easy mechanism to do this.

Imagine the event emitter:

```js
websocket.addEventListener('message', callback);
```

We would like to feed this stream of messages into an AsyncIterable, so we can do:

```js
for await (const message of messages) {
  // Do stuff with message.
  if (done) break;
}
```

and do stuff. We might also want to call `removeEventListener` when we break (or return or throw) out of the loop.

## Usage

The default export is a factory function.

```js
import { makeStream } from '@graffy/stream';
```

### Minimal Example

This handles subscribing and unsubscribing from the event emitter.

```js
const stream = makeStream((push) => {
  eventSource.on('event', push);
  return () => eventSource.off('event', push);
});
```

The return value, `stream`, is an AsyncIterable that can be used in a for-await-of loop.

### Handle upstream end

This handles situations where the "upstream" event emitter has an "end" event, which should make the "downstream" for-await-of loop end as well.

```js
const stream = makeStream((push, end) => {
  eventSource.on('event', (event) => push(event));
  eventSource.on('end', () => end());
  return () => eventSource.close();
});
```

### Handle errors

This handles errors in both directions. The "upstream" might close with an error, which should be communicated downstream as the for-await-of loop throwing. Less often, if the code inside the loop throws, we might want to communicate that upstream.

Both are handled by the "end" functions being called with an error object as an argument.

```js
const stream = makeStream((push, end) => {
  eventSource.on('event', (event) => push(event));
  eventSource.on('end', () => end());
  eventSource.on('error', (error) => end(error));
  return (error) => {
    if (error) {
      eventSource.closeWithError();
      return;
    }
    eventSource.close();
  };
});
```

### Backpressure

When streams are used to pipe IO events, we might run into a situation where the downstream consumer is slower than the upstream producer. If left unchecked, we might run out of memory - we need to maintain a buffer of unconsumed events.

To handle this situation, the producer might expose methods to pause and resume the stream of events; if not, in some situations, it might also be appropriate to unsubscribe and resubscribe.

Graffy stream exposes an interface to do these, with configurable high and low water marks.

```js
const stream = makeStream(
  (push) => {
    eventSource.on('event', (event) => {
      const wait = push(event);
      if (wait) {
        eventSource.pause();
        wait.then(() => eventSource.resume());
      }
    });

    return () => eventSource.close();
  },
  { highWatermark: 255, lowWatermark: 4 },
);
```

If there are more than `highWatermark` unconsumed events, `push()` will return a Promise `wait`. As the consumer catches up and the number of unconsumed events fall below `lowWatermark`, this promise will resolve.
