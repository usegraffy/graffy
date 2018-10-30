export default function makeIterator(fn) {
  const payloads = [];
  const requests = [];
  let done = false;

  const push = payload => {
    if (done) return;
    payload = { value: payload, done: false };
    if (!requests.length) return payloads.push(payload);
    requests.shift()(payload);
  };
  const close = fn(push);

  return {
    next() {
      if (done) return Promise.resolve({ value: void 0, done: true });
      if (payloads.length) return Promise.resolve(payloads.shift());
      return new Promise(resolve => requests.push(resolve));
    },

    return(val) { done = true; close(val); },
    [Symbol.iterator]() { return this; }
  };
}
