import { dirname } from 'path';
import { fileURLToPath } from 'url';
import express from 'express';

import Graffy from '@graffy/core';
import fill from '@graffy/fill';
import memory from '@graffy/memory';
import { httpServer, wsServer } from '@graffy/server';
import mock from './mockVisitorList';

const __dirname = dirname(fileURLToPath(import.meta.url));

const store = new Graffy();
store.use(fill());
store.use(memory());
store.use(mock);

const app = express();
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.end('Ok');
    return;
  }
  next();
});

app.use('/api', httpServer(store));
app.use(express.static(__dirname + '/public'));
const server = app.listen(8443);

server.on('upgrade', wsServer(store));

// eslint-disable-next-line no-console
console.log('Server started at 8443');
