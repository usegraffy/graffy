import Graffy from './Graffy';
import { graph, query } from '@graffy/common';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
describe('streams', () => {
  let g;

  beforeEach(() => {
    g = new Graffy();
  });

  test('object', async () => {
    g.onSub('/foo', async function*() {
      yield graph({ foo: { a: 3 } });
      await sleep(10);
      yield graph({ foo: { a: 4 } });
    });
    const sub = g.sub(query({ foo: { a: true } }));

    expect((await sub.next()).value).toEqual(graph({ foo: { a: 3 } }));
    expect((await sub.next()).value).toEqual(graph({ foo: { a: 4 } }));
  });
});
