import React from 'react';
import Graffy from '@graffy/core';
import { useQuery } from './';
import { mockBackend } from '@graffy/testing';
import { GraffyProvider } from './GraffyContext';
import { renderHook } from '@testing-library/react-hooks';

describe('useQuery', () => {
  let g;
  let wrapper;
  let backend;

  beforeEach(() => {
    g = new Graffy();
    backend = mockBackend();
    backend.read = jest.fn(backend.read);
    g.use(backend.middleware);
    wrapper = function ({ children }) {
      return <GraffyProvider store={g}>{children}</GraffyProvider>;
    };
  });

  test('loading', async () => {
    const value = 'abcde';
    await g.write('/demo', { value });
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
});
