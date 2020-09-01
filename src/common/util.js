export function throwIf(message, condition) {
  if (condition) throw Error('arg_encoding.' + message);
}

export function empty(object) {
  for (const _ in object) return false;
  return true;
}
