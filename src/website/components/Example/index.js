import React from 'react';
import Graffy from '@graffy/core';
import fill from '@graffy/fill';
import client from '@graffy/client';
// import mock from './mockVisitorList';
import { GraffyProvider } from '@graffy/react';

import Example from './Example';
// import './index.css';

const store = new Graffy();
if (process.browser) {
  store.use(fill());
  // store.use(mock);
  store.use(client('ws://localhost:3000/api'));
}

export default function ExampleProvider() {
  return (
    <GraffyProvider store={store}>
      <Example />
    </GraffyProvider>
  );
}
