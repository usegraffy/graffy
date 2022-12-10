import isEqual from 'lodash/isEqual.js';
import { isEmpty } from './util.js';
import { splitArgs } from './coding/index.js';

export function mergeObject(base, change) {
  if (
    typeof change !== 'object' ||
    typeof base !== 'object' ||
    !base ||
    !change
  ) {
    return change;
  }

  for (const prop in change) {
    if (prop in base) {
      const value = mergeObject(base[prop], change[prop]);
      if (value === null) {
        delete base[prop];
      } else {
        base[prop] = value;
      }
    } else {
      base[prop] = change[prop];
    }
  }

  return isEmpty(base) ? null : base;
}

export function cloneObject(object) {
  if (typeof object !== 'object' || !object) {
    return object;
  }

  const clone = {};

  for (const prop in object) {
    const value = cloneObject(object[prop]);
    if (value === null) continue;
    clone[prop] = value;
  }

  return isEmpty(clone) ? null : clone;
}

export function wrapObject(object, path) {
  if (!Array.isArray(path)) throw Error(`wrapObject.path_not_array ${path}`);
  for (let i = path.length - 1; i >= 0; i--) {
    const $key = path[i];
    if (typeof $key === 'string') {
      object = { [$key]: object };
    } else if (Array.isArray(object)) {
      object = [{ $key, $chi: object }];
    } else {
      object = [{ $key, ...object }];
    }
  }
  return object;
}

export function unwrapObject(object, path) {
  if (!Array.isArray(path)) throw Error(`unwrapObject.path_not_array ${path}`);
  for (let i = 0; i < path.length; i++) {
    if (!object || typeof object !== 'object') return;
    const $key = path[i];
    if (typeof $key === 'string') {
      if (Array.isArray(object)) {
        throw Error(`unwrapObject.string_key_array:${$key}`);
      }
      object = object[$key];
    } else {
      if (!Array.isArray(object)) {
        throw Error(`unwrapObject.arg_key_object:${JSON.stringify($key)}`);
      }
      const [page, filter] = splitArgs($key);
      if (page && !page.$cursor) {
        // TODO: Return a slice of this array
        return object;
      } else {
        const target = page?.$cursor
          ? { ...filter, $cursor: page.$cursor }
          : filter;
        object = object.find(({ $key }) => isEqual($key, target));
      }
    }
  }
  return object;
}
