# graffy/server

## graffyServer(store)

- Argument: A graffy store
- Returns: A Node.js HTTP request handler

Exposes a Graffy store over an HTTP-based API, that can be consumed by GraffyClient. The return value can be used with plain Node.js `createServer()` or with frameworks like Express.

### Example

```js
import express from 'express';
import Graffy from 'graffy';
import graffyServer from 'graffy/server';

const store = new Graffy();
const app = express();

app.use('/api', graffyServer(store));
```
