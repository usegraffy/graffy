# Tutorial

In this tutorial, we'll build a simple chat app using Express, React, PostgreSQL and Graffy. You need Node.js, PostgreSQL and NPM installed.

You should also have an empty database, and the corresponding PostgreSQL connection parameters in the [psql environment variables](https://www.postgresql.org/docs/current/libpq-envars.html).

## Create the project

To start the project, create a React app and a Node.js server for the API.

```
$ npx create-react-app mychat
$ cd mychat
$ npm i --save express @graffy/core @graffy/server \
  @graffy/pg @graffy/client @graffy/cache @graffy/react
```

We’ll be using `npm start` to start the React dev server for the client, which runs on port 3000. We’ll run the chat server on port 5000, so we need to tell the React dev server to make it available to the client.

To do this, edit `package.json` and add:

```json
"proxy": "http://localhost:5000"`
```

## Hello, Graffy

Create a file `server/store.js` and write a simple Graffy store:

```js
const Graffy = require('@graffy/core');
const store = Graffy();

store.onRead(() => ({
  hello: 'world';
}));

module.exports = store;
```

Then, create a separate file `server/index.js` to set up an express app to serve this store over HTTP.

```js
const express = require('express');
const GraffyServer = require('@graffy/server');
const store = require('./store');

const app = express();
app.use('/api', GraffyServer(g, { explorer: 'explore' }));
app.listen(5000);

console.log('Server started at 5000');
```

### Test it out

Run the server with `node server.js` and test it out by visiting http://localhost:5000/api/explore in a browser. Type the query:

```js
{ hello: 1 }
```

and click Read. The response should be `{ "hello": "world" }`.

## A place for data

Our data model will have two entities, users - with names and avatars - and messages - with text, timestamp and a link to the sender. Use the following SQL in psql to create and initialize the tables:

```sql
CREATE TABLE "user" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT,
  "avatar" TEXT,
  "version": INTEGER
);

CREATE TABLE "message" (
  "id" TEXT PRIMARY KEY,
  "text" TEXT,
  "time" INTEGER,
  "authorId" TEXT,
  "version": INTEGER
);

CREATE INDEX ON "message" ("time");

INSERT INTO "user" VALUES
  ('alice', 'Alice', 'alice.png'),
  ('bob', 'Bob', 'bob.png');
```

## Connecting the database

We’ll now _mount_ these tables to the graffy tree using the `@graffy/pg` module by describing the tables to Graffy. Let’s update `server/store.js` to do this:

```js
const Graffy = require('@graffy/core');
const pg = require('@graffy/pg');
const store = Graffy();

store.use('user', pg({
  columns: {
    id: { role: 'primary' },
    name: { role: 'simple' },
    avatar: { role: 'simple' },
    version: { role: 'version '}
  }
}));

store.use('message', pg({
  columns: {
    id: { role: 'primary' },
    text: { role: 'simple' },
    time: { role: 'simple' },
    authorId: { role: 'simple' },
    version: { role: 'version' }
  },
  links: {
    author: { target: 'user', prop: 'authorId' }
  }
}));

module.exports = store;
```

The `links` object tells GraffyPG to construct an `author` link using the value in the `authorId` column.

### Test it out

Restart the server and visit http://localhost:5000/api/explore to try out the following:

1. **Read** a user:
    ```js
    { user: { alice: { name: 1, avatar: 1 } } }
    ```
    The result should be `{ name: 'Alice', avatar: 'alice.png' }`.

2. **Watch** the last 3 messages:
    ```js
    { message: {
      $key: { order: ['time', 'id'], last: 3 },
      text: 1,
      time: 1,
      author: { name: 1 }
    } }
    ```
    The initial result should be an empty array, `[]`. Keep this tab open.

3. In a new browser tab, **write** a message:
    ```js
    { message: { message0: {
      id: 'message0',
      text: 'Test message 1',
      time: 10,
      authorId: 'alice'
    } } }
    ```
    This should complete without error, returning the object you wrote.

4. Switch back to the **watch** tab. The result should now update automatically and show the message you just added.

## Add some business logic

We probably don't want the client to set the time for new messages. Another requirement might be to prevent the client from updating existing messages. We do this by adding a _middleware_ provider. Add these lines to `server/store.js`, _before_ the first call to `store.use()`.

```js
store.use('message', provider({
  async write(change, options, next) {
    change.time = Date.now();
    return next(change, options);
  }
}));
```

Note the call to `next()`, this forwards the request to the next provider (GraffyPG).

You may be wondering whether we should generate IDs on the server too; while this is possible, there are advantages to client-generated IDs. We’ll see them as we build the client.

## On to the client

Once again, we create a store in a separate file,`src/store.js`:

```js
import Graffy from '@graffy/core';
import cache from '@graffy/cache';
import client from '@graffy/client';

const store = new Graffy();
store.use(cache());
store.use(client('/api'));

export default store;
```

and we update `src/index.js` to use this. Add the following imports:

```js
import { GraffyProvider } from '@graffy/react';
import store from './store.js';
```

and on the line which calls ReactDOM.render, replace `<App />` with:
```js
<GraffyProvider store={store}>
  <App />
</GraffyProvider>
```
