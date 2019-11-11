# graffy/client

## graffyClient(url)

- Argument: url of the Graffy server
- Returns: Graffy module that works with use()

A client for the Graffy server. It delegates all reads, watches and writes to the server.

It uses the EventStream API for server push.

### Example
```js
import Graffy from 'graffy';
import graffyClient from `graffy/client`;

const store = new Graffy();
store.use(graffyClient('/api'));
```
