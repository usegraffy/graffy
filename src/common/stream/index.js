/*
  @graffy/stream

  Utility for creating async iterables (streams) from any callback-based
  event source.

  Minimal Usage:

  const stream = makeStream(push => {
    eventSource.on('event', push);
    return () => eventSource.off('event', push);
  });

  Handle upstream ending:

  const stream = makeStream((push, end) => {
    eventSource.on('event', event => push(event));
    eventSource.on('end', () => end());
    return () => eventSource.close();
  });

  Handle errors:

  const stream = makeStream((push, end) => {
    eventSource.on('event', event => push(event));
    eventSource.on('end', () => end());
    eventSource.on('error', error => end(error));
    return error => {
      if (error) {
        eventSource.closeWithError();
        return;
      }
      eventSource.close();
    }
  });

  Backpressure:

  const stream = makeStream(push => {
    eventSource.on('event', event => {
      const wait = push(event);
      if (wait) {
        eventSource.pause();
        wait.then(() => eventSource.resume());
      }
    });

    return () => eventSource.close();
  });
*/

const normalCompletion = Promise.resolve({ value: void 0, done: true });
const HIGH_WATER_MARK = 255; // Number of pending payloads

export default function makeStream(init) {
  const payloads = [];
  const requests = [];
  let complete;
  let drain;

  const push = value => {
    if (complete) return;
    const payload = { value, done: false };
    if (requests.length) return requests.shift()(payload);
    payloads.push(payload);
    if (payloads.length >= HIGH_WATER_MARK) {
      return new Promise(resolve => {
        drain = resolve;
      });
    }
  };

  const end = error => {
    complete = error ? Promise.reject(error) : normalCompletion;
    let resolve;
    while ((resolve = requests.shift())) resolve(complete);
  };

  const close = init(push, end);

  return {
    next: () => {
      if (payloads.length) return payloads.shift();
      if (drain) {
        drain();
        drain = null;
      }
      if (complete) return complete;
      return new Promise(resolve => requests.push(resolve));
    },

    return(val) {
      complete = normalCompletion;
      payloads.length = 0;
      close(null, val);
      return complete;
    },

    throw(error) {
      complete = Promise.reject(error);
      payloads.length = 0;
      close(error);
      return complete;
    },

    [Symbol.asyncIterator]() {
      return this;
    },
  };
}
