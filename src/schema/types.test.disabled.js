import { struct, map, tuple, string, number } from './';

describe('schema', () => {
  test('validate', () => {
    const schema = struct({
      users: map(string, struct({ name: string })),
      pokes: map(string, struct({ message: string })),
    });

    const val = {
      users: {
        asdf: { name: 'Asdf' },
        ghi: { name: 'Ghi' },
      },
      pokes: {
        f324: { message: 'asdf' },
      },
    };
    expect(schema.validate(val)).toBe(true);
  });
});

describe('cursor', () => {
  const cursortype = tuple(
    struct({ role: string, foo: number }),
    string,
    number,
  );

  test('deflate', () => {
    const arr = [];
    cursortype.deflate([{ role: 'poker' }, '234', 43], arr);
    expect(arr).toEqual([undefined, 'poker', '234', 43]);
  });

  test('inflate', () => {
    const arr = [undefined, 'poker', '234', 43];
    expect(cursortype.inflate(arr)).toEqual([{ role: 'poker' }, '234', 43]);
  });
});
