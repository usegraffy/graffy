import { createOptions } from '../../options.js';

test('no_options', () => {
  expect(createOptions(['blog', 'users'], {})).toEqual({
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
    createOptions(['blog', 'users'], {
      table: 'user',
      columns: {
        uid: { role: 'primary' },
        type: { role: 'simple' },
        config: { role: 'default' },
        version: { role: 'version' },
      },
    }),
  ).toEqual({
    prefix: ['blog', 'users'],
    table: 'user',
    columns: {
      uid: { role: 'primary', prop: 'uid' },
      type: { role: 'simple', prop: 'type' },
    },
    props: { uid: { data: 'uid' }, type: { data: 'type' } },
    args: {
      uid: { role: 'primary', name: 'uid' },
      type: { role: 'simple', name: 'type' },
    },
    updaters: {},
    idCol: 'uid',
    idProp: 'uid',
    defCol: 'config',
    verCol: 'version',
    links: {},
  });
});
