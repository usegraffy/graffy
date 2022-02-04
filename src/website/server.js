import express from 'express';
import { createServer as createViteServer } from 'vite';

import debug from 'debug';
import Graffy from '@graffy/core';
import fill from '@graffy/fill';
import memory from '@graffy/memory';
import { httpServer, wsServer } from '@graffy/server';
import mock from './services/mockVisitorList.js';

const log = debug('graffy:website:server');
const port = process.env.PORT || 3000;

const store = new Graffy();
store.use(fill());
store.use(memory());
store.use(mock);

// const express = require('express')

async function createServer() {
  const app = express();

  // Create vite server in middleware mode.
  const vite = await createViteServer({
    server: { middlewareMode: 'html' },
  });

  app.use('/api', httpServer(store));

  // Use vite's connect instance as middleware
  app.use(vite.middlewares);

  const conn = app.listen(port, (err) => {
    if (err) throw err;
    if (process.send) process.send('ready');
    log(`Ready on port ${port}`);
  });

  conn.on('upgrade', wsServer(store));
}

createServer();
