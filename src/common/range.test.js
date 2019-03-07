import { RANGE_PATTERN, decRange, encRange } from './range';
import { MIN_KEY, MAX_KEY } from './constants';

describe('range pattern', () => {
  const testRange = (str, groups) =>
    test(str, () =>
      expect([...str.match(RANGE_PATTERN)]).toEqual([str, ...groups]),
    );

  test('non-range', () => expect('key'.match(RANGE_PATTERN)).toEqual(null));
  testRange('*', ['', '*', '', '', '']);
  testRange('key1*', ['key1', '*', '', '', '']);
  testRange('*key1', ['', '*', 'key1', '', '']);
  testRange('n**', ['n', '**', '', '', '']);
  testRange('**n', ['', '**', 'n', '', '']);
  testRange('key0*key1', ['key0', '*', 'key1', '', '']);
  testRange('key1*n**', ['key1', '*', 'n', '**', '']);
  testRange('**n*key1', ['', '**', 'n', '*', 'key1']);
  testRange('key0*n**key1', ['key0', '*', 'n', '**', 'key1']);
  testRange('key0**n*key1', ['key0', '**', 'n', '*', 'key1']);
});

describe('decRange', () => {
  const testRange = (str, range) =>
    test(str, () => expect(decRange(str)).toEqual(range));

  testRange('*', { after: MIN_KEY, before: MAX_KEY });
  testRange('key1*', { after: 'key1', before: MAX_KEY });
  testRange('*key1', { after: MIN_KEY, before: 'key1' });
  testRange('3**', { after: MIN_KEY, before: MAX_KEY, first: 3 });
  testRange('**3', { after: MIN_KEY, before: MAX_KEY, last: 3 });
  testRange('key0*key1', { after: 'key0', before: 'key1' });
  testRange('key1*3**', { after: 'key1', before: MAX_KEY, first: 3 });
  testRange('**3*key1', { after: MIN_KEY, before: 'key1', last: 3 });
  testRange('key0*3**key1', { after: 'key0', before: 'key1', first: 3 });
  testRange('key0**3*key1', { after: 'key0', before: 'key1', last: 3 });
});

describe('encRange', () => {
  const testRange = (str, range) =>
    test(str, () => expect(encRange(range)).toEqual(str));

  testRange('*', { after: MIN_KEY, before: MAX_KEY });
  testRange('key1*', { after: 'key1', before: MAX_KEY });
  testRange('*key1', { after: MIN_KEY, before: 'key1' });
  testRange('3**', { after: MIN_KEY, before: MAX_KEY, first: 3 });
  testRange('**3', { after: MIN_KEY, before: MAX_KEY, last: 3 });
  testRange('key0*key1', { after: 'key0', before: 'key1' });
  testRange('key1*3**', { after: 'key1', before: MAX_KEY, first: 3 });
  testRange('**3*key1', { after: MIN_KEY, before: 'key1', last: 3 });
  testRange('key0*3**key1', { after: 'key0', before: 'key1', first: 3 });
  testRange('key0**3*key1', { after: 'key0', before: 'key1', last: 3 });
});
