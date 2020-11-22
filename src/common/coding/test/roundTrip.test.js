import {
  decodeGraph,
  decodeQuery,
  encodeGraph,
  encodeQuery,
} from '../index.js';

test('cursor', () => {
  const original = [
    {
      _key_: { order: ['id'], cursor: [123] },
      name: 'Alice',
    },
  ];
  const encoded = encodeGraph(original);
  const decoded = decodeGraph(encoded);
  expect(decoded).toEqual(original);
});

test('firstN', () => {
  const original = {
    _key_: { order: ['id'], first: 3 },
    name: true,
  };
  const encoded = encodeQuery(original);
  const decoded = decodeQuery(encoded);
  expect(decoded).toEqual(original);
});
