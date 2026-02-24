import { encode, decode } from '../id.js';
import { v4 } from 'uuid';

test('roundtrip', () => {
  const bytes = new Uint8Array(16);
  v4({}, bytes);
  const str = encode(bytes);
  const bytes2 = decode(str);
  expect(bytes2).toEqual(bytes);
});
