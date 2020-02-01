import { dirname } from 'path';
import { fileURLToPath } from 'url';
import express from 'express';

import Graffy from '@graffy/core';
import GraffyFill from '@graffy/fill';
import GraffyCache from '@graffy/cache';
import GraffyServer from '@graffy/server';
import mock from './mockVisitorList';

const __dirname = dirname(fileURLToPath(import.meta.url));

const store = new Graffy();
store.use(GraffyFill());
store.use(GraffyCache({ final: true }));
store.use(mock);

const app = express();
app.use('/api', GraffyServer(store));
app.use(express.static(__dirname + '/public'));
app.listen(8443);

// eslint-disable-next-line no-console
console.log('Server started at 8443');
