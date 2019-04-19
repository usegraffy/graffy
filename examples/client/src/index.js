import React from 'react';
import ReactDOM from 'react-dom';
import Graffy from '@graffy/core';
import GraffyCache from '@graffy/cache';
import GraffyClient from '@graffy/client';
import { GraffyProvider } from '@graffy/react';

import App from './components/App';
import './index.css';

const store = new Graffy();
store.use(GraffyCache());
store.use(GraffyClient('http://localhost:8443'));

ReactDOM.render(
  <GraffyProvider store={store}>
    <App />
  </GraffyProvider>,
  document.getElementById('root'),
);
