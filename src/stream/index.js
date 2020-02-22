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

  const push = value => {
    if (complete) return;
    const payload = { value, done: false };
    if (requests.length) return requests.shift()(payload);
    payloads.push(payload);
    if (payloads.length >= highWatermark) {
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
    debugId,

    next: () => {
      if (drain && payloads.length <= lowWatermark) {
        drain();
        drain = null;
      }
      if (payloads.length) return payloads.shift();
      if (complete) return complete;
      return new Promise(resolve => requests.push(resolve));
    },

    map(fn) {
      return makeStream((push, end) => {
        const next = () => {
          this.next()
            .then(({ value, done }) => {
              if (done) return end();
              push(fn(value));
              next();
            })
            .catch(error => end(error));
        };
        next();
        return (error, value) => {
          error ? this.throw(error) : this.return(value);
        };
      });
    },

    return(value) {
      complete = Promise.resolve({ value, done: true });
      payloads.length = 0;
      close(null, value);
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
