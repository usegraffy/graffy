import mergeStreams from 'merge-async-iterators';
import { wrap, unwrap, remove, merge } from '@graffy/common';
import makeStream from '@graffy/stream';
import { debug } from '@graffy/testing';

export function shiftFn(fn, path) {
  return async function shiftedFunction(payload, options, next) {
    let nextCalled = false;
    let remainingNextResult;
    const unwrappedPayload = unwrap(payload, path);
    const remainingPayload = remove(payload, path) || [];

    // This next function is offered to the provider function.
    async function shiftedNext(nextPayload) {
      console.log('shiftedNext', debug(nextPayload));
      nextCalled = true;
      nextPayload = wrap(nextPayload, path);
      if (remainingPayload.length) merge(nextPayload, remainingPayload);
      const nextResult = await next(nextPayload);

      // Remember the next() results that are not returned to this provider.
      // These will be merged into the result later.
      remainingNextResult = remove(nextResult, path) || [];
      return unwrap(nextResult, path);
    }

    const result = wrap(await fn(unwrappedPayload, options, shiftedNext), path);

    if (!nextCalled && remainingPayload.length) {
      remainingNextResult = await next(remainingPayload);
    }

    if (remainingNextResult && remainingNextResult.length) {
      merge(result, remainingNextResult);
    }

    return result;
  };
}

// TODO: shiftGen is incomplete.

export function shiftGen(fn, path) {
  return async function(payload, options, next) {
    let nextCalled = false;
    let remainingNextStream = makeStream;
    const unwrappedPayload = unwrap(payload, path);
    const remainingPayload = remove(payload, path) || [];

    const shiftedNext = async function*(nextPayload) {
      nextCalled = true;

      for await (const value of await next(wrap(nextPayload, path))) {
        yield unwrap(value, path);
      }
    };

    const result = fn(unwrappedPayload, options, shiftedNext);

    // We expect next() to be called before the first value is yielded.
    const firstValue = await result.next();
    const resultStream = (async function*() {
      yield wrap(firstValue, path);
      for await (const value of result) yield wrap(value, path);
    })();

    if (!nextCalled && remainingPayload.length) {
      remainingNextStream = next(remainingPayload);
    }

    return mergeStreams([resultStream, remainingNextStream]);
  };
}
