import find from '../find';

test('exact matches', () => {
  expect(find([1, 2, 3, 4, 5], (n) => n - 3)).toBe(2);
  expect(find([1, 2, 3, 4, 5], (n) => n - 2)).toBe(1);
  expect(find([1, 2, 3, 4, 5], (n) => n - 1)).toBe(0);
  expect(find([1, 2, 3, 4, 5], (n) => n - 4)).toBe(3);
  expect(find([1, 2, 3, 4, 5], (n) => n - 5)).toBe(4);
});

test('insert positions', () => {
  expect(find([1, 2, 3, 4, 5], (n) => n - 0)).toBe(0);
  expect(find([1, 2, 3, 4, 5], (n) => n - 2.5)).toBe(2);
  expect(find([1, 2, 3, 4, 5], (n) => n - 7)).toBe(5);
});
