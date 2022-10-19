import { isMaxKey, isMinKey } from '../util';

// export function keyStep(key) {
//   if (ArrayBuffer.isView(key)) return keyStepBin(key);
//   if (key === '') return { key, step: 1 };
//   if (key === '\uffff') return { key, step: -1 };
//   const l = key.length - 1;
//   switch (key.charCodeAt(l)) {
//     case 0:
//       return { key: key.substr(0, l), step: 1 };
//     case 0xffff:
//       return {
//         key:
//           key.substr(0, l - 1) + String.fromCharCode(key.charCodeAt(l - 1) + 1),
//         step: -1,
//       };
//     default:
//       return { key, step: 0 };
//   }
// }

// export function keyBefore(key) {
//   if (ArrayBuffer.isView(key)) return keyBeforeBin(key);
//   if (key === '' || key === '\uffff' || key === '\0' || key === '\0\uffff') {
//     return key;
//   }
//   const l = key.length - 1;
//   return key.charCodeAt(l) === 0
//     ? key.substr(0, l)
//     : key.substr(0, l) + String.fromCharCode(key.charCodeAt(l) - 1) + '\uffff';
// }

// export function keyAfter(key) {
//   if (ArrayBuffer.isView(key)) return keyAfterBin(key);
//   if (key === '\uffff' || key === '\0' || key === '\0\uffff') {
//     return key;
//   }
//   const l = key.length - 1;
//   return key.charCodeAt(l) === 0xffff
//     ? key.substr(0, l - 1) + String.fromCharCode(key.charCodeAt(l - 1) + 1)
//     : key + '\0';
// }

export function keyStep(key) {
  if (isMinKey(key)) return { key, step: 1 };
  if (isMaxKey(key)) return { key, step: -1 };
  const l = key.length - 1;
  let newKey;
  switch (key[l]) {
    case 0:
      return { key: key.slice(0, l), step: 1 };
    case 0xff:
      newKey = key.slice(0, l);
      newKey[l - 1]++;
      return { key: newKey, step: -1 };
    default:
      return { key, step: 0 };
  }
}

export function keyBefore(key) {
  if (isMinKey(key) || isMaxKey(key)) return key;

  const l = key.length - 1;
  let newKey;
  if (key[l] === 0) {
    newKey = key.slice(0, l);
  } else {
    newKey = new Uint8Array(l + 2);
    newKey.set(key, 0);
    newKey[l]--;
    newKey[l + 1] = 0xff;
  }
  return newKey;
}

export function keyAfter(key) {
  if (isMinKey(key) || isMaxKey(key)) return key;

  const l = key.length - 1;
  let newKey;
  if (key[l] === 0xff) {
    newKey = key.slice(0, l);
    newKey[l - 1]++;
  } else {
    newKey = new Uint8Array(l + 2);
    newKey.set(key, 0);
    newKey[l + 1] = 0;
  }
  return newKey;
}
