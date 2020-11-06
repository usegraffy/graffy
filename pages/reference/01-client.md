# graffy/client

## graffyClient(url, [options])

- Arguments: url, options
- Returns: Graffy module that works with use()

A client for the Graffy server. It delegates all reads, watches and writes to the server. It uses the EventStream API for server push.

The `watch` option is a string which accepts either `none` or `hang` values (default undefined). By passing `none`, watch functionality is disabled. By passing `hang`, all watch queries behave as `read` queries.

The `connInfoPath` (default `/connection`) is a special path in graffy which can be used to modify the url passed on the fly!

Only options returned by `getOptions` function are passed to server-side providers.

### getOptions(operation, clientOptions)

- Arguments: operation, client-side options object
- Returns: server-side options object

### Example

```js
import Graffy from 'graffy';
import graffyClient from `graffy/client`;

const store = new Graffy();
const getOptions = (operation, clientOptions) => ({
  sessionId: '12345',
  customOption: clientOptions.customOption
});
store.use(graffyClient('/api', {
  getOptions,
}));
```
