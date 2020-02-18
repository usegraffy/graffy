# graffy/client

## graffyClient(url, [getOptions])

- Argument: url
- Returns: Graffy module that works with use()

A client for the Graffy server. It delegates all reads, watches and writes to the server. It uses the EventStream API for server push.

Only options returned by getOptions are passed to server-side providers.

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
store.use(graffyClient('/api', getOptions));
```
