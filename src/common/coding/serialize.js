export function serialize(obj) {
  return JSON.stringify(obj).replace(/\uffff/g, '\\uffff');
}

export function deserialize(str) {
  return JSON.parse(str);
}
