# Graffy Client

Graffy client library for the browser, usin the `fetch()` or `WebSocket` APIs. This module is intended to be used with a Node.js server running Graffy Server.

## Usage

```js
import Graffy from '@graffy/core';
import client from '@graffy/client';

const store = new Graffy();
store.use(client(url, options));

// Add downstream providers to the store
```

An HTTP connection is used if the URL begins with `http(s)://`, and a Websocket is used if it begins with `ws(s)://`.

### Options

- `getOptions(operation, payload, options)`, a callback to get the options that should be passed to the server with each operation.
- `connInfoPath`, a location in the store to put connection metadata. Defaults to `connection`.

### Connection status

If using a WebSocket connection, Graffy client creates a `connection: { status: boolean }` node in the store. The location of this node can be controlled by the `connInfoPath` option. Reading from or watching this node provides information about the current connection status. The application may explicitly tear-down or re-establish connections by writing `false` or `true` to it, respectively.

See [Graffy documentation](https://graffy.org#/GraffyClient) for more.

