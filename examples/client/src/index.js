import React from 'react';
import ReactDOM from 'react-dom';
import Graffy from '@graffy/core';
import GraffyClient from '@graffy/client';

import { GraffyProvider } from './useGraffy';

import App from './components/App';
import './index.css';

const store = new Graffy();
store.use(GraffyClient('http://localhost:8443'));

ReactDOM.render(
  <GraffyProvider store={store}>
    <App />
  </GraffyProvider>,
  document.getElementById('root'),
);
