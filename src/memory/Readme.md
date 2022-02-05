# Graffy Memory

Graffy module providing a simple in-memory store.

## Usage

```js
import Graffy from '@graffy/core';
import link from '@graffy/link';

const store = new Graffy();
store.use('local', memory());
```

See [Graffy documentation](https://graffy.org) for more.
