/*
  This file should not use async/await as it's intended to be usable without
  the regenerator polyfill.
*/

const normalCompletion = Promise.resolve({ value: void 0, done: true });

export default function makeStream(init, options = {}) {
  const payloads = [];
  const requests = [];
  let complete;
  let drain;

  const { highWatermark = Infinity, lowWatermark = 0, debugId } = options;

  const push = (value) => {
    if (complete) return;
    const payload = Promise.resolve({ value, done: false });
    if (requests.length) return requests.shift()(payload);
    payloads.push(payload);
    if (payloads.length >= highWatermark) {
      return new Promise((resolve) => {
        drain = resolve;
      });
    }
  };

  const end = (error) => {
    complete = error ? Promise.reject(error) : normalCompletion;
    let resolve;
    while ((resolve = requests.shift())) resolve(complete);
  };

  let close;
  let initialized = false;

  return {
    debugId,

    next: () => {
      if (!initialized) {
        close = init(push, end);
        initialized = true;
      }
      if (drain && payloads.length <= lowWatermark) {
        drain();
        drain = null;
      }
      if (payloads.length) return payloads.shift();
      if (complete) return complete;
      return new Promise((resolve) => requests.push(resolve));
    },

    return(value) {
      complete = Promise.resolve({ value, done: true });
      payloads.length = 0;
      if (close) close(null, value);
      return complete;
    },

    throw(error) {
      complete = Promise.reject(error);
      payloads.length = 0;
      if (close) close(error);
      return complete;
    },

    [Symbol.asyncIterator]() {
      return this;
    },
  };
}
