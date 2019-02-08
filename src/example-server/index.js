import http2 from 'http2';
import path from 'path';
import fs from 'fs';

import Grue from '@grue/core';
import GrueServer from '@grue/server';
import mock from './mockVisitorList';

const g = new Grue();
const middle = new GrueServer();
g.use(mock);
g.use(middle.grue);

const server = http2.createSecureServer({
  key: fs.readFileSync(path.resolve(__dirname, './keys/localhost-privkey.pem')),
  cert: fs.readFileSync(path.resolve(__dirname, './keys/localhost-cert.pem')),
  allowHTTP1: true
}, (req, res) => {
  res.setHeader('access-control-allow-origin', '*');
  middle.http(req, res);
});

server.on('error', (err) => console.error(err));

server.listen(8443);
console.log('Server started at 8443');
