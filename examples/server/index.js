const http = require('http');

import Graffy from '@graffy/core';
import GraffyCache from '@graffy/cache';
import GraffyServer from '@graffy/server';
import mock from './mockVisitorList';

console.log(Graffy);

const g = new Graffy();
g.use(GraffyCache());
g.use(mock);
const graffyHandle = new GraffyServer(g);

http
  .createServer((req, res) => {
    res.setHeader('access-control-allow-origin', '*');
    graffyHandle(req, res);
  })
  .listen(8443);

// eslint-disable-next-line no-console
console.log('Server started at 8443');
