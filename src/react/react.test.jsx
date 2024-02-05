/**
 * @jest-environment ../scripts/jestDomEnvironment.cjs
 */

import { encodeQuery } from '@graffy/common';
import Graffy from '@graffy/core';
import { mockBackend } from '@graffy/testing';
import { jest } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { GraffyProvider } from './GraffyContext.jsx';
import { useQuery } from './index.js';

describe('useQuery', () => {
  let g;
  let wrapper;
  let backend;
  const value = 'abcde';

  beforeEach(async () => {
    g = new Graffy();
    backend = mockBackend();
    backend.read = jest.fn(backend.read);
    g.use(backend.middleware);
    await g.write('demo', { value });

    wrapper = function _Wrapper({ children }) {
      return <GraffyProvider store={g}>{children}</GraffyProvider>;
    };
  });

  const expectLifeCycle = async (result, beforeLoading, afterLoading) => {
    const query = encodeQuery(afterLoading.data);

    expect(result.current).toStrictEqual({ ...beforeLoading, loading: true });
    const initialLoading = result.current.loading;
    await waitFor(() =>
      expect(result.current.loading).not.toBe(initialLoading),
    );
    expect(result.current).toStrictEqual({ ...afterLoading, loading: false });
    expect(result.error).toBeFalsy();
    expect(backend.read).toHaveBeenCalledWith(query, {}, expect.any(Function));
  };

  test('loading', async () => {
    const data = { demo: { value } };
    const { result } = renderHook(
      () => useQuery({ demo: { value: 1 } }, { once: true }),
      { wrapper },
    );

    const refetch = expect.any(Function);
    await expectLifeCycle(result, { refetch }, { data, error: null, refetch });
  });

  test('refetch', async () => {
    const data = { demo: { value } };
    const { result } = renderHook(
      () => useQuery({ demo: { value: 1 } }, { once: true }),
      { wrapper },
    );
    const refetch = expect.any(Function);

    // normal lifecycle
    await expectLifeCycle(result, { refetch }, { data, error: null, refetch });

    // update store
    const newValue = '12345';
    await g.write('demo', { value: newValue });
    const newData = { demo: { value: newValue } };

    // call refetch
    act(() => {
      result.current.refetch();
    });

    await expectLifeCycle(
      result,
      { data, error: null, refetch },
      { data: newData, error: null, refetch },
    );
  });
});
