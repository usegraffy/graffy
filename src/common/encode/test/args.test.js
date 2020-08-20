import { encode } from '../args.js';

test('before', () => {
  expect(encode({ before: ['a'] })).toEqual({
    key: '\0',
    end: '\x000VKV\uffff',
  });
});
