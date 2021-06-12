import makeOptions from '../options.js';

test('no_options', () => {
  expect(makeOptions(['blog', 'users'], {})).toEqual({
    prefix: ['blog', 'users'],
    table: 'users',
    columns: { id: { prop: 'id', role: 'primary' } },
    props: { id: { data: 'id' } },
    args: { id: { name: 'id', role: 'primary' } },
    updaters: { data: '||' },
    links: {},
    idCol: 'id',
    idProp: 'id',
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
        config: { role: 'default', updater: '||' },
        tags: { role: 'gin', props: ['locale', 'timezone'] },
        version: { role: 'version' },
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
      uid: { name: 'uid', role: 'primary' },
      userType: { name: 'type', role: 'simple' },
      locale: { name: 'tags', role: 'gin' },
      timezone: { name: 'tags', role: 'gin' },
    },
    updaters: {
      config: '||',
    },
    links: {},
    idProp: 'uid',
    idCol: 'uid',
    verCol: 'version',
    defCol: 'config',
  });
});
