import { encodePath } from '@graffy/common';

function isPlainObject(obj) {
  return obj && typeof obj === 'object' && !Array.isArray(obj);
}

/*
any -> payload

object, object -> payload, options
string | array, any -> path, payload

string | array, any, object -> path, payload, options
*/
export function validateCall(...args) {
  if (args.length === 1) {
    return [[], args[0], {}];
  } else if (args.length === 2) {
    if (isPlainObject(args[0])) {
      if (!isPlainObject(args[1])) {
        throw Error(`validateCall.invalid_options: ${JSON.stringify(args[1])}`);
      }
      return [[], args[0], args[1]];
    } else {
      return [encodePath(args[0]), args[1]];
    }
  } else if (args.length === 3) {
    if (!isPlainObject(args[2])) {
      throw Error(`validateCall.invalid_options: ${JSON.stringify(args[1])}`);
    }
    return [encodePath(args[0]), args[1], args[2]];
  }

  throw Error(`validateCall.invalid_args: ${JSON.stringify(args)}`);
}

export function validateOn(...args) {
  if (args.length === 1) {
    if (typeof args[0] !== 'function') {
      throw Error(`validateOn.invalid_handler: ${JSON.stringify(args[0])}`);
    }
    return [[], args[0]];
  } else if (args.length === 2) {
    if (typeof args[1] !== 'function') {
      throw Error(`validateOn.invalid_handler: ${JSON.stringify(args[1])}`);
    }
    return [encodePath(args[0]), args[1]];
  }

  throw Error(`validateOn.invalid_args: ${JSON.stringify(args)}`);
}
