import React from 'react';
import Graffy from '@graffy/core';
import { useQuery } from './';
import { mockBackend } from '@graffy/testing';
import { GraffyProvider } from './GraffyContext';
import { act, renderHook } from '@testing-library/react-hooks';

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

  test('loading', async () => {
    const { result, waitForValueToChange } = renderHook(
      () => useQuery({ demo: { value: 1 } }, { once: true }),
      {
        wrapper,
      },
    );
    expect(result.current).toMatchObject({ loading: true });
    await waitForValueToChange(() => result.current.loading);
    expect(result.current).toMatchObject({
      data: { demo: { value } },
      loading: false,
    });
    expect(result.error).toBeFalsy();
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
    expect(result.current).toMatchObject({ loading: true });
    await waitForValueToChange(() => result.current.loading);
    expect(result.current).toMatchObject({ loading: false, data });
    expect(result.error).toBeFalsy();

    // update store
    const newValue = '12345';
    await g.write('demo', { value: newValue });
    data.demo.value = newValue;

    // call reload
    act(() => {
      result.current.reload();
    });

    // same lifecycle should follow with updated data
    expect(result.current).toMatchObject({ loading: true });
    await waitForValueToChange(() => result.current.loading);
    expect(result.current).toMatchObject({ loading: false, data });
    expect(result.error).toBeFalsy();
  });
});
