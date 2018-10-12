/*
  syncWrap: Wraps an async generator function so that
  it is notified (via yield throwing) when the iterator
  returns.

  e.g. Say you're writing an async generator that opens
  a network connection and streams values as they are
  received.

  The consumer would typically use a for-await-of loop
  to receive these values, and may decide to `break`
  out of the loop.

  Normally, async generators are not notified when the
  consuming loop exits (via a break, return or throw)
  and therefore do not get a chance to cleanly close
  the network connection.

  syncWrap solves this by making the generator's yield
  throw an exception when the consuming loop exits.
  This exception can be caught and responded to.
*/

export class Return extends Error {
  constructor(value) {
    super('Return');
    this.value = value;
  }
}

export default function syncWrap(gen) {
  return function(...args) {
    const iter = gen(...args);
    return {
      next(val) { iter.next(val); },
      return(val) { iter.throw(new Return(val)); },
      throw(err) { iter.throw(err); },
      [Symbol.iterator]() { return this; }
    };
  };
}

syncWrap.Return = Return;
