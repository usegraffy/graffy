import Graffy from '../Graffy';

describe('watch', () => {
  let g;

  beforeEach(() => {
    g = new Graffy();
  });

  test('object', async () => {
    g.onWatch('/foo', async function* () {
      yield { a: 3 };
      await Promise.resolve();
      yield { a: 4 };
    });
    const subscription = g.watch({ foo: { a: true } });

    expect((await subscription.next()).value).toEqual({ foo: { a: 3 } });
    expect((await subscription.next()).value).toEqual({ foo: { a: 4 } });
  });
});
