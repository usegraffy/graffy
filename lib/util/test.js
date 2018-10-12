import { RANGE_PATTERN } from '.';

describe('range pattern', () => {
  const testRange = (str, groups) =>
    test(str, () => expect([...(str.match(RANGE_PATTERN))]).toEqual([ str, ...groups ]));

  test('non-range', () => expect('key'.match(RANGE_PATTERN)).toEqual(null));
  testRange('*', ['', '*', '', '', '']);
  testRange('key1*', ['key1', '*', '', '', '']);
  testRange('*key1', ['', '*', 'key1', '', '']);
  testRange('n**', ['n', '**', '', '', '']);
  testRange('**n', ['', '**', 'n', '', '']);
  testRange('key0*key1', ['key0', '*', 'key1', '', '']);
  testRange('key1*n**', ['key1', '*', 'n', '**', '']);
  testRange('**n*key1', ['', '**', 'n', '*', 'key1']);
  testRange('m*key1*n', ['m', '*', 'key1', '*', 'n']);
  testRange('key0*n**key1', ['key0', '*', 'n', '**', 'key1']);
  testRange('key0**n*key1', ['key0', '**', 'n', '*', 'key1']);
});
