import { encode } from './src/common/coding/base64.js';

function a2n(arr) {
  let big = 0n;
  for (const byte of arr) {
    big = (big << 8n) + BigInt(byte);
  }
  return big;
}

function n2a(big) {
  const arr = [];
  while (big > 0n) {
    arr.unshift(Number(big % 0x100n));
    big = big >> 8n;
  }
  return new Uint8Array(arr);
}

function randArray(n) {
  const arr = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    arr[i] = Math.floor(0x100 * Math.random());
  }
  return arr;
}

function compareArrays(a, b) {
  const l = a.length < b.length ? a.length : b.length;
  for (let i = 0; i < l; i++) {
    if (a[i] < b[1]) return -1;
    if (a[i] > b[i]) return 1;
  }
  if (a.length < b.length) return -1;
  if (a.length > b.length) return 1;
  return 0;
}

const arrs = [];
const strs = [];
const bigs = [];

const N = 50000;
const S = 500;

let start = performance.now();

for (let i = 0; i < N; i++) {
  arrs.push(randArray(S));
}

console.log(performance.now() - start + ': Generated typed arrays');
start = performance.now();

for (let i = 0; i < N; i++) {
  strs.push(encode(arrs[i]));
}

console.log(performance.now() - start + ': Encoded strings');
start = performance.now();

// for (let i = 0; i < N; i++) {
//   bigs.push(a2n(arrs[i]));
// }

// console.log(performance.now() - start + ': Encoded bigints');
// start = performance.now();

strs.sort();

console.log(performance.now() - start + ': Sorted strs');
start = performance.now();

// bigs.sort();

// console.log(performance.now() - start + ': Sorted bigs');
// start = performance.now();

arrs.sort(compareArrays);

console.log(performance.now() - start + ': Sorted typedarrays');
