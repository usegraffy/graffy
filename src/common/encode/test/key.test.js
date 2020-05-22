import { encode, decode } from '../key.js';

function tryValue(value) {
  const enc = encode(value);
  const dec = decode(enc);
  expect(dec).toEqual(value);
}

test('emptyobj', () => {
  tryValue({});
});

test('emptyarr', () => {
  tryValue([]);
});

test('simpleobj', () => {
  tryValue({ f: 3 });
});

test('simplearr', () => {
  tryValue([33]);
});

test('sink', () => {
  tryValue({
    a: '',
    b: -23.6,
    c: [1, false, 'Hello!', {}, []],
    d: true,
    e: null,
  });
});

test('num', () => tryValue(123));

test('arrayorder', () => {
  expect(encode([15.6, 'abc']) < encode([15.7])).toBe(true);
  expect(encode([15.6, 'abc']) > encode([15.6])).toBe(true);
});
