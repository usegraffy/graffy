import React from 'react';
import { act, renderHook } from '@testing-library/react-hooks';
import Graffy from '@graffy/core';
import { encodeQuery } from '@graffy/common';
import { mockBackend } from '@graffy/testing';
import { useQuery } from './';
import { GraffyProvider } from './GraffyContext';

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

  const expectLifeCycle = async (
    { result, waitForValueToChange },
    beforeLoading,
    afterLoading,
  ) => {
    const query = encodeQuery(afterLoading.data);

    expect(result.current).toStrictEqual({ ...beforeLoading, loading: true });
    await waitForValueToChange(() => result.current.loading);
    expect(result.current).toStrictEqual({ ...afterLoading, loading: false });
    expect(result.error).toBeFalsy();
    expect(backend.read).toHaveBeenCalledWith(query, {}, expect.any(Function));
  };

  test('loading', async () => {
    const data = { demo: { value } };
    const { result, waitForValueToChange } = renderHook(
      () => useQuery({ demo: { value: 1 } }, { once: true }),
      {
        wrapper,
      },
    );

    const reload = expect.any(Function);
    await expectLifeCycle(
      { result, waitForValueToChange },
      { reload },
      { data, error: null, reload },
    );
  });

  test('reload', async () => {
    const data = { demo: { value } };
    const { result, waitForValueToChange } = renderHook(
      () => useQuery({ demo: { value: 1 } }, { once: true }),
      {
        wrapper,
      },
    );
    const reload = expect.any(Function);

    // normal lifecycle
    await expectLifeCycle(
      { result, waitForValueToChange },
      { reload },
      { data, error: null, reload },
    );

    // update store
    const newValue = '12345';
    await g.write('demo', { value: newValue });
    const newData = { demo: { value: newValue } };

    // call reload
    act(() => {
      result.current.reload();
    });

    await expectLifeCycle(
      { result, waitForValueToChange },
      { data, error: null, reload },
      { data: newData, error: null, reload },
    );
  });
});
