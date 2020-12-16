import makeOptions from '../options';

test('no_options', () => {
  expect(makeOptions(['blog', 'users'], {})).toEqual({
    prefix: ['blog', 'users'],
    table: 'users',
    columns: {},
    props: {},
    args: {},
    links: {},
    idCol: 'id',
    verCol: 'version',
    defCol: 'data',
  });
});

test('sink', () => {
  expect(
    makeOptions(['blog', 'users'], {
      table: 'user',
      columns: {
        uid: { role: 'primary' },
        type: { role: 'simple', prop: 'userType' },
        config: { role: 'default' },
        tags: { role: 'gin', props: ['locale', 'timezone'] },
      },
    }),
  ).toEqual({
    prefix: ['blog', 'users'],
    table: 'user',
    columns: {
      uid: { role: 'primary', prop: 'uid' },
      type: { role: 'simple', prop: 'userType' },
    },
    props: {
      uid: { data: 'uid' },
      userType: { data: 'type' },
      locale: { gin: ['tags'] },
      timezone: { gin: ['tags'] },
    },
    args: {
      locale: { name: 'tags', role: 'gin' },
      timezone: { name: 'tags', role: 'gin' },
    },
    links: {},
    idCol: 'uid',
    verCol: 'version',
    defCol: 'config',
  });
});
