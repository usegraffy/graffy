import finalize from '../finalize';

test('prefix-regression', () => {
  expect(
    finalize(
      [
        {
          key: 'users',
          version: 0,
          children: [
            {
              key: '',
              version: 0,
              children: [
                {
                  key: '\x000VJsOL7rD24WOXpYDL4aAIGaCLBhDL3tOXorCI4WBaNkCa8ZCIZ',
                  version: 0,
                  path: ['users', 'f77cecc8-fac5-46c5-a277-4d470f9354f9'],
                },
              ],
              prefix: true,
            },
            {
              key: 'f77cecc8-fac5-46c5-a277-4d470f9354f9',
              version: 0,
              children: [{ key: 'name', version: 0, value: 'A' }],
            },
          ],
        },
      ],
      [
        {
          key: 'users',
          version: 0,
          children: [
            {
              key: '',
              end: '\uffff',
              version: 0,
              children: [{ key: 'name', version: 0, value: 1 }],
            },
          ],
        },
      ],
      0,
    ),
  ).toEqual([
    {
      key: 'users',
      version: 0,
      children: [
        {
          key: '',
          version: 0,
          children: [
            {
              key: '',
              end: '\x000VJsOL7rD24WOXpYDL4aAIGaCLBhDL3tOXorCI4WBaNkCa8ZCIY\uffff',
              version: 0,
            },
            {
              key: '\x000VJsOL7rD24WOXpYDL4aAIGaCLBhDL3tOXorCI4WBaNkCa8ZCIZ',
              version: 0,
              path: ['users', 'f77cecc8-fac5-46c5-a277-4d470f9354f9'],
            },
            {
              key: '\x000VJsOL7rD24WOXpYDL4aAIGaCLBhDL3tOXorCI4WBaNkCa8ZCIZ\x00',
              end: '\uffff',
              version: 0,
            },
          ],
          prefix: true,
        },
        {
          key: 'f77cecc8-fac5-46c5-a277-4d470f9354f9',
          version: 0,
          children: [{ key: 'name', version: 0, value: 'A' }],
        },
      ],
    },
  ]);
});
