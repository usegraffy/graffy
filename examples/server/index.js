const http = require('http');

const Graffy = require('@graffy/core');
const GraffyServer = require('@graffy/server');
const mock = require('./mockVisitorList');

const g = new Graffy();
const middle = new GraffyServer();
g.use(mock);
g.use(middle.graffy);

http
  .createServer((req, res) => {
    res.setHeader('access-control-allow-origin', '*');
    middle.http(req, res);
  })
  .listen(8443);

// eslint-disable-next-line no-console
console.log('Server started at 8443');
