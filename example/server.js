import express from 'express';

import Graffy from '@graffy/core';
import GraffyCache from '@graffy/cache';
import GraffyServer from '@graffy/server';
import mock from './mockVisitorList';

const g = new Graffy();
g.use(GraffyCache());
g.use(mock);

const app = express();
app.use('/api', GraffyServer(g));
app.use(express.static(__dirname + '/public'));
app.listen(8443);

// eslint-disable-next-line no-console
console.log('Server started at 8443');
