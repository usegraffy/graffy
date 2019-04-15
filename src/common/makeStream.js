export default function makeStream(close) {
  const payloads = [];
  const requests = [];
  let done = false;

  const push = value => {
    if (done) return;
    const payload = { value, done: false };
    if (requests.length) return requests.shift()(payload);
    return payloads.push(payload);
  };

  const pull = () => {
    if (done) return Promise.resolve({ value: void 0, done: true });
    if (payloads.length) return Promise.resolve(payloads.shift());
    return new Promise(resolve => requests.push(resolve));
  };

  const stream = {
    next: pull,

    return(val) {
      done = true;
      close(val);
    },

    [Symbol.asyncIterator]() {
      return this;
    },
  };

  return [push, stream];
}
