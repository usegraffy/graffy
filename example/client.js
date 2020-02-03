import React from 'react';
import ReactDOM from 'react-dom';
import Graffy from '@graffy/core';
import GraffyFill from '@graffy/fill';
import GraffyClient from '@graffy/client';
// import mock from './mockVisitorList';
import { GraffyProvider } from '@graffy/react';

import App from './components/App';
// import './index.css';

const store = new Graffy();
store.use(GraffyFill());
// store.use(mock);
store.use(GraffyClient('/api'));

ReactDOM.render(
  <GraffyProvider store={store}>
    <App />
  </GraffyProvider>,
  document.getElementById('root'),
);
