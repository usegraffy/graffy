export function keyStep(key) {
  if (key === '') return { key, step: 1 };
  if (key === '\uffff') return { key, step: -1 };
  const l = key.length - 1;
  switch (key.charCodeAt(l)) {
    case 0:
      return { key: key.substr(0, l), step: 1 };
    case 0xffff:
      return {
        key:
          key.substr(0, l - 1) + String.fromCharCode(key.charCodeAt(l - 1) + 1),
        step: -1,
      };
    default:
      return { key, step: 0 };
  }
}

export function keyBefore(key) {
  if (key === '' || key === '\uffff') return key;
  const l = key.length - 1;
  return key.charCodeAt(l) === 0
    ? key.substr(0, l)
    : key.substr(0, l) + String.fromCharCode(key.charCodeAt(l) - 1) + '\uffff';
}

export function keyAfter(key) {
  if (key === '' || key === '\uffff') return key;
  const l = key.length - 1;
  return key.charCodeAt(l) === 0xffff
    ? key.substr(0, l - 1) + String.fromCharCode(key.charCodeAt(l - 1) + 1)
    : key + '\0';
}
