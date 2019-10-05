import { wrap, unwrap, remove, merge, mergeStreams } from '@graffy/common';
import makeStream from '@graffy/stream';

export function shiftFn(fn, path) {
  return async function shiftedFn(payload, options, next) {
    let nextCalled = false;
    let remainingNextResult;
    const unwrappedPayload = unwrap(payload, path);
    const remainingPayload = remove(payload, path) || [];

    // This next function is offered to the provider function.
    async function shiftedNext(nextPayload) {
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

// TODO: Provider calling next in a subscription function is not tested.

export function shiftGen(fn, path) {
  return async function* shiftedGen(payload, options, next) {
    let nextCalled = false;
    let remainingNextStream;
    const unwrappedPayload = unwrap(payload, path);
    const remainingPayload = remove(payload, path) || [];

    const shiftedNext = async function*(nextPayload) {
      nextCalled = true;
      nextPayload = wrap(nextPayload, path);
      if (remainingPayload.length) merge(nextPayload, remainingPayload);

      let pushRemaining;
      remainingNextStream = makeStream(push => {
        pushRemaining = push;
      });

      for await (const value of next(nextPayload)) {
        const unwrappedValue = unwrap(value, path);
        const remainingValue = remove(value, path);
        if (remainingValue) pushRemaining(remainingValue);
        if (unwrappedValue) yield unwrappedValue;
      }
    };

    const unwrappedStream = fn(unwrappedPayload, options, shiftedNext);

    // We expect next() to be called before the first value is yielded.
    const firstValue = await (await unwrappedStream.next()).value;
    const resultStream = (async function*() {
      yield wrap(firstValue, path);
      for await (const value of unwrappedStream) yield wrap(value, path);
    })();

    if (!nextCalled && remainingPayload.length) {
      remainingNextStream = next(remainingPayload);
    }

    if (!remainingNextStream) yield* resultStream;
    yield* mergeStreams(resultStream, remainingNextStream);
  };
}
