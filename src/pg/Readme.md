# Postgres

The standard Postgres module for Graffy. Each instance this module mounts a Postgres table as a Graffy subtree.

## Usage
```js
import pg from '@graffy/pg'

graffyStore.use(pg(options));
```

Connection parameters should be set in environment variables. Uses the [pg](https://github.com/brianc/node-postgres) library.

## Options

In this document, *property names* and *paths* refer to the structures in the Graffy graph objects, *columns* refer to Postgres table columns and *args* refer to structures in the filtering and pagination arguments of Graffy query objects.

- **table**, the name of the PostgreSQL table
- **columns**, an object with column names as keys and an objects describing each column as value. Each descriptor object contains a mandatory **role** property, which may be:
  - **primary**, for the primary key column of this table. There must be exactly one primary column.
  - **simple**, for a normal column, which stores the value of a particular property of this object.
  - **default**, for a JSON column where all data that isn't mapped to another column is placed. There may be zero or one default column.
  - **version**, for a numeric column used to store the version number of the object. There must be exactly one version column.
  - **gin**, for a JSONB column into which some properties are copied, for enabling filtering and sorting using that property.
  - **tsv**, for an indexed tsvector column for full text searches
  - **trgm**, for a trigram-indexed text column for typeahead searches

  The descriptor object may also have the following additional properties.
  - **prop**, the property name or path that maps to this column. Valid for **simple** and **primary** columns. Defaults to the name of the column.
  - **props**, an array of property names or paths to copy into a **gin**, **tsv** or **trgm** column. Mandatory for these columns.
  - **arg**, the filter argument for querying a **tsv** or **trgm** column. Defaults to the column name.
- **links**, an object with props as keys and link descriptors as values. The
  link descriptor contains:
  - **target**: the prefix of a collection to link into
  - **backProp**: for filtered links, the prop on the target collection that contains the id of objects in this collection.
- **pollInterval**, the interval at which the table is polled, for watch.

```js
{

  table: string, // the name of the PostgreSQL table
  columns: {
    [columnName]: {
      role: 'primary' | 'simple' | 'default' |
            'version' | 'gin' | 'tsv' | 'trgm',
      prop: string // primary or simple only
      props: [string] // gin, tsv or trgm only
      arg: string // tsv or trgm only
    }
  },
  links: {
    [prop]: {
      target: string,
      backProp: string,
    }
  }
}
```
