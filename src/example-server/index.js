import http from 'http';
import path from 'path';
import fs from 'fs';

import Grue from '@grue/core';
import GrueServer from '@grue/server';
import mock from './mockVisitorList';

const g = new Grue();
const middle = new GrueServer();
g.use(mock);
g.use(middle.grue);

http
  .createServer((req, res) => {
    res.setHeader('access-control-allow-origin', '*');
    middle.http(req, res);
  })
  .listen(8443);
console.log('Server started at 8443');
