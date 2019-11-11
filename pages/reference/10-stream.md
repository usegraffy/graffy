# graffy/stream

## makeStream(initializer)

Constructs an async iterable. This utility is more convenient than async generator functions for consuming from a callback-based event emitter.

- Arguments: initializer
- Returns: AsyncIterable

### initializer(push, end)

Called synchronously, the initializer should subscribe to the event emitter and return a function that, when called, unsubscribes from it.

- Arguments: push, end
- Returns: unsubscribe

### push(value)

Yield this value from the async iterator. This function is typically called from the event emitter subscription handler.

- Argument: value
- Return: drainPromise

### end(error)

Signal to the consumer of the async iterator that the event emitter has closed. The error argument is optional. This is typically called from the event emitter's close and error handlers.

### unsubscribe(error)

The unsubscribe function returned by the initializer is called when the consumer of the async iterator stops consuming it. If it stopped consuming due to an error, the error argument will be passed.

### drainPromise

**Advanced**: Async iterators are a pull-based streaming mechanism, whereas event emitters are push-based. If the event emitter is pushing values faster than the consumer is pulling, the internal value buffer used by makeStream might grow too big.

Some event emitters (e.g. Node.js streams) provide a "backpressure" mechanism to pause and resume the push of events. The drainPromise mechanism allows interfacing with this.

The push function returns a drainPromise when the buffer exceeds a predefined high water mark. (Note that this does not mean the push failed - it continues to accept pushes until the system runs out of memory.) The drainPromise resolves when the buffer falls below a predefined low water mark as it is 'drained' (emptied) by the consumer.

Typically, a backpressure-capable subscription should be paused when push returns a drainPromise, and resumed when that promise resolves.
