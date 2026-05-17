import assert from 'node:assert/strict';
import { beforeEach, describe, mock, test } from 'node:test';
import Graffy from '../Graffy.ts';

describe('write', () => {
  let g;

  beforeEach(() => {
    g = new Graffy();
  });

  test('should call the write handler with args', async () => {
    const handler = mock.fn((change) => change);
    g.onWrite(handler);
    await g.write({ foo: 42 });
    assert.deepStrictEqual((handler.mock.calls as any[])[0].arguments[0], {
      foo: 42,
    });
    assert.deepStrictEqual((handler.mock.calls as any[])[0].arguments[1], {});
    assert.ok(
      typeof (handler.mock.calls as any[])[0].arguments[2] === 'function',
    );
  });
});
