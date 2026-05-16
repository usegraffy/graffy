import assert from 'node:assert/strict';
import { beforeEach, describe, mock, test } from 'node:test';
import { encodeQuery } from '@graffy/common';
import Graffy from '@graffy/core';
import { mockBackend } from '@graffy/testing';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { GraffyProvider } from './GraffyContext.ts';
import { useQuery } from './index.ts';

describe('useQuery', () => {
  let g;
  let wrapper;
  let backend;
  const value = 'abcde';

  beforeEach(async () => {
    g = new Graffy();
    backend = mockBackend();
    backend.read = mock.fn(backend.read);
    g.use(backend.middleware);
    await g.write('demo', { value });

    wrapper = function _Wrapper({ children }) {
      return createElement(GraffyProvider as any, { store: g }, children);
    };
  });

  const expectLifeCycle = async (result, expectedData) => {
    assert.strictEqual(result.current.loading, true);
    await waitFor(() => {
      assert.strictEqual(result.current.loading, false);
    });
    assert.deepStrictEqual(result.current.data, expectedData);
    assert.strictEqual(result.current.error, null);
    assert.ok(!result.error);
    assert.ok(typeof result.current.refetch === 'function');
  };

  test('loading', async () => {
    const data = { demo: { value } };
    const { result } = renderHook(
      () => useQuery({ demo: { value: 1 } }, { once: true }),
      { wrapper },
    );

    await expectLifeCycle(result, data);
    assert.ok(backend.read.mock.callCount() > 0);
    const query = encodeQuery(data);
    assert.deepStrictEqual(
      (backend.read.mock.calls as any[])[0].arguments[0],
      query,
    );
    assert.deepStrictEqual(
      (backend.read.mock.calls as any[])[0].arguments[1],
      {},
    );
    assert.ok(
      typeof (backend.read.mock.calls as any[])[0].arguments[2] === 'function',
    );
  });

  test('refetch', async () => {
    const data = { demo: { value } };
    const { result } = renderHook(
      () => useQuery({ demo: { value: 1 } }, { once: true }),
      { wrapper },
    );

    // normal lifecycle
    await expectLifeCycle(result, data);

    // update store
    const newValue = '12345';
    await g.write('demo', { value: newValue });
    const newData = { demo: { value: newValue } };

    // call refetch
    act(() => {
      (result.current as any).refetch();
    });

    await expectLifeCycle(result, newData);
  });
});
