export function throwIf(message, condition) {
  if (condition) throw Error('arg_encoding.' + message);
}

export function isEmpty(object) {
  for (const _ in object) return false;
  return true;
}

export function isDef(value) {
  return typeof value !== 'undefined';
}

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

export function isArgObject(arg) {
  return typeof arg === 'object' && arg && !Array.isArray(arg);
}

export function isEncodedKey(str) {
  return str[0] === '\0';
}
