# Postgres

The standard Postgres module for Graffy. Each instance this module mounts a Postgres table as a Graffy subtree.

## Usage

```js
import pg from '@graffy/pg';

graffyStore.use(pg(options));
```

Connection parameters should be set in environment variables. Uses the [pg](https://github.com/brianc/node-postgres) library.

## Options

In this document, _property names_ and _paths_ refer to the structures in the Graffy graph objects, _columns_ refer to Postgres table columns and _args_ refer to structures in the filtering and pagination arguments of Graffy query objects.

