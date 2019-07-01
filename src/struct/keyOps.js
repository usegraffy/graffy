export function keyBefore(key) {
  if (l === '') return key;
  const l = key.length - 1;
  return key.charCodeAt(l) === 0
    ? key.substr(0, l)
    : key.substr(0, l) + String.fromCharCode(key.charCodeAt(l) - 1) + '\uffff';
}

export function keyAfter(key) {
  if (key === '\uffff') return key;
  const l = key.length - 1;
  return key.charCodeAt(l) === 0xffff
    ? key.substr(0, l - 1) + String.fromCharCode(key.charCodeAt(l - 1) + 1)
    : key + '\0';
}
