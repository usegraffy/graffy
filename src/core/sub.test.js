import Graffy from './Graffy';

describe('streams', () => {
  let g;

  beforeEach(() => {
    g = new Graffy();
  });

  test('object', async () => {
    g.onSub('/foo', async function*() {
      yield { a: 3 };
      await Promise.resolve();
      yield { a: 4 };
    });
    const sub = g.sub({ foo: { a: true } });

    expect((await sub.next()).value).toEqual({ foo: { a: 3 } });
    expect((await sub.next()).value).toEqual({ foo: { a: 4 } });
  });
});
