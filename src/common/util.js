export function throwIf(message, condition) {
  if (condition) throw Error('arg_encoding.' + message);
}

export function empty(object) {
  for (const _ in object) return false;
  return true;
}

export function mergeObject(base, change) {
  if (typeof change !== 'object' || typeof base !== 'object' || !base) {
    return change;
  }

  for (const prop in change) {
    if (change[prop] === null) {
      delete base[prop];
      continue;
    }

    if (prop in base) {
      base[prop] = mergeObject(base[prop], change[prop]);
    } else {
      base[prop] = change[prop];
    }
  }

  return base;
}
