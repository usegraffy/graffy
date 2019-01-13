import { union, inter, diff } from './interval';

test('union', () => {
  expect(union([1, 4, 7, 8], [5, 6])).toEqual([1, 4, 5, 6, 7, 8]);
  expect(union([1, 4, 7, 8], [2, 3])).toEqual([1, 4, 7, 8]);
  expect(union([1, 4, 7, 8], [2, 4])).toEqual([1, 4, 7, 8]);
  expect(union([1, 4, 7, 8], [4, 6])).toEqual([1, 6, 7, 8]);
  expect(union([1, 4, 7, 8], [3, 7])).toEqual([1, 8]);
  expect(union([1, 4, 7, 9], [3, 8])).toEqual([1, 9]);
  expect(union([1, 4, 7, 9], [3, 3, 5, 5])).toEqual([1, 4, 5, 5, 7, 9]);
  expect(union([1, 4, 4, 7], [])).toEqual([1, 7]);
});

test('inter', () => {
  expect(inter([1, 4, 7, 8], [5, 6])).toEqual([]);
  expect(inter([1, 4, 7, 8], [2, 3])).toEqual([2, 3]);
  expect(inter([1, 4, 7, 8], [2, 4])).toEqual([2, 4]);
  expect(inter([1, 4, 7, 8], [4, 6])).toEqual([]);
  expect(inter([1, 4, 7, 8], [3, 7])).toEqual([3, 4, 7, 7]);
  expect(inter([1, 4, 7, 8], [0, 9])).toEqual([1, 4, 7, 8]);
  expect(inter([1, 4, 7, 9], [3, 8])).toEqual([3, 4, 7, 8]);
  expect(inter([1, 4, 7, 9], [3, 3, 5, 5])).toEqual([3, 3]);
});

test('diff', () => {
  expect(diff([1, 4, 7, 8], [5, 6])).toEqual([1, 4, 7, 8]);
  expect(diff([1, 4, 7, 8], [2, 3])).toEqual([1, 2, 3, 4, 7, 8]);
  expect(diff([1, 4, 7, 8], [2, 4])).toEqual([1, 2, 7, 8]);
  expect(diff([1, 4, 7, 8], [4, 6])).toEqual([1, 4, 7, 8]);
  expect(diff([1, 4, 7, 8], [3, 7])).toEqual([1, 3, 7, 8]);
  expect(diff([1, 4, 7, 8], [0, 9])).toEqual([]);
  expect(diff([1, 4, 7, 9], [3, 8])).toEqual([1, 3, 8, 9]);
  expect(diff([1, 4, 7, 9], [3, 3, 5, 5])).toEqual([1, 4, 7, 9]);
});
