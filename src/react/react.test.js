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

  it('should transition loading as "true -> false" cycle on data fetch', async () => {
    const value = 'abcde';
    await g.write('/demo', { value });
    const { result, waitForValueToChange } = renderHook(
      () => useQuery({ demo: { value: 1 } }, { once: true }),
      {
        wrapper,
      },
    );
    expect(result.current).toEqual([null, true, null]);
    await waitForValueToChange(() => result.current[1]);
    expect(result.current).toEqual([{ demo: { value } }, false, null]);
    expect(result.error).toBeFalsy();
  });
});
