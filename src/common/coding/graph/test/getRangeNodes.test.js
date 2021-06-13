import getRangeNodes from '../getRangeNodes.js';

test('stopAtGap', () => {
  expect(
    getRangeNodes(
      [
        { key: '', end: 'baq\uffff', version: 0 },
        { key: 'bar', version: 0, path: ['foo'] },
        { key: 'bar\u0000', end: 'bay\uffff', version: 0 },
        { key: 'baz', version: 0, path: ['foo'] },
        { key: 'foo', version: 0, value: 3 },
      ],
      { key: '', end: '\uffff', limit: 10, value: 1 },
    ),
  ).toEqual([
    { key: '', end: 'baq\uffff', version: 0 },
    { key: 'bar', version: 0, path: ['foo'] },
    { key: 'bar\u0000', end: 'bay\uffff', version: 0 },
    { key: 'baz', version: 0, path: ['foo'] },
  ]);
});
