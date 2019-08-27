import { encode, decode } from '../index.js';

function tryValue(value) {
  const enc = encode(value);
  const dec = decode(enc);
  expect(dec).toEqual(value);
}

test('sink', () => {
  tryValue({
    a: '',
    b: -23.6,
    c: [1, false, 'Hello!', {}, []],
    d: true,
    e: null,
  });
});
