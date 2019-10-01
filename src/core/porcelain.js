import {
  wrap,
  unwrap,
  descend,
  remove,
  add,
  merge,
  makeQuery,
  makeGraph,
  makeFinalGraph,
} from '@graffy/common';
import { debug } from '@graffy/testing';

export function porcelainGet(fn) {
  return async function porcelainGetFunction(query, options) {
    return makeFinalGraph(await fn(query, options), query);
  };
}

export function porcelainSub(fn) {
  return async function*(query, options) {
    for await (const value of fn(query, options)) {
      yield makeFinalGraph(value, query);
    }
  };
}

export function porcelainPut(fn, path) {
  return async (change, options, next) => {
    let nextCalled = false;

    const unwrappedPayload = unwrap(change, path);
    const remainingPayload = remove(change, path);

    const shiftedNext = async nextPayload => {
      nextCalled = true;
      const wrappedPayload = add(remainingPayload, wrap(nextPayload));
      unwrap(await next(wrappedPayload), path);
    };
    const result = wrap(await fn(unwrappedPayload, options, shiftedNext), path);

    console.log('! shiftFn1', path, change);
    console.log('! shiftFn2', result, nextCalled, remainingPayload);
    if (!nextCalled && remainingPayload.length) {
      const nextResult = await next(remainingPayload);
      merge(result, nextResult);
    }

    return result;
  };
}
