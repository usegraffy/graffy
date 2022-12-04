import { addStringify, isMaxKey, isMinKey } from '../util.js';

export function keyStep(key) {
  if (isMinKey(key)) return { key, step: 1 };
  if (isMaxKey(key)) return { key, step: -1 };
  const l = key.length - 1;
  let newKey;
  let step;
  switch (key[l]) {
    case 0:
      newKey = key.slice(0, l);
      addStringify(newKey);
      step = 1;
      break;
    case 0xff:
      newKey = key.slice(0, l);
      addStringify(newKey);
      newKey[l - 1]++;
      step = -1;
      break;
    default:
      newKey = key;
      step = 0;
  }
  return { key: newKey, step };
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
  addStringify(newKey);
  return newKey;
}

export function keyAfter(key) {
  if (isMaxKey(key)) return key;

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
  addStringify(newKey);
  return newKey;
}
