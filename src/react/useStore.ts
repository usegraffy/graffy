import React from 'react';
import { GraffyContext } from './GraffyContext.ts';

const { useContext } = React;

export default function useStore() {
  const store = useContext(GraffyContext);
  return store;
}
