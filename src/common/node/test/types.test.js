import { compareVersion, isNewer, isOlder } from '../types.js';

test('compareVersion supports strings and dates', () => {
  expect(
    compareVersion('2026-04-22 09:40:58.501', '2026-04-22 09:40:58.502'),
  ).toBe(-1);
  expect(
    compareVersion(
      new Date('2026-04-22T09:40:58.501Z'),
      new Date('2026-04-22T09:40:58.500Z'),
    ),
  ).toBe(1);
});

test('isOlder and isNewer use compareVersion', () => {
  expect(isOlder({ version: 'b' }, 'c')).toBe(true);
  expect(isNewer({ version: 'c' }, 'b')).toBe(true);
  expect(isOlder({ version: new Date('2026-04-22T09:40:58.500Z') }, 0)).toBe(
    false,
  );
});
