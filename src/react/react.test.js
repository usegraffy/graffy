import React from 'react';
import { act, renderHook } from '@testing-library/react-hooks';
import Graffy from '@graffy/core';
import { makeQuery } from '@graffy/common';
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
    await g.write('/demo', { value });

    wrapper = function _Wrapper({ children }) {
      return <GraffyProvider store={g}>{children}</GraffyProvider>;
    };
  });

  const expectLifeCycle = async ({ result, waitForValueToChange }, data) => {
    const query = makeQuery(data);

    expect(result.current).toStrictEqual({
      loading: true,
      reload: expect.any(Function),
    });
    await waitForValueToChange(() => result.current.loading);
    expect(result.current).toStrictEqual({
      loading: false,
      error: null,
      reload: expect.any(Function),
      data,
    });
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

    await expectLifeCycle({ result, waitForValueToChange }, data);
  });

  test('reload', async () => {
    const data = { demo: { value } };
    const { result, waitForValueToChange } = renderHook(
      () => useQuery({ demo: { value: 1 } }, { once: true }),
      {
        wrapper,
      },
    );
    // normal lifecycle
    await expectLifeCycle({ result, waitForValueToChange }, data);

    // update store
    const newValue = '12345';
    await g.write('/demo', { value: newValue });
    data.demo.value = newValue;

    // call reload
    act(() => {
      result.current.reload();
    });

    await expectLifeCycle({ result, waitForValueToChange }, data);
  });
});
