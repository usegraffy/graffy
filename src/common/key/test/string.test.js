import { encode, decode } from '../string';

function tryString(str) {
  const arr = encode(str);
  const dec = decode(arr);
  console.log(str, arr, dec, str === dec);
}

test('string', () => {
  tryString('');
  tryString('Hello');
});
