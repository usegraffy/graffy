# Tutorial

**This tutorial is WIP and uses the 'graffy' meta package that is not yet ready.**

In this tutorial, we'll build a simple chat app using Express, React and Graffy. You need Node.js and NPM installed.

## Create the project

To start the project, create a React app and a Node.js server for the API.

```
$ npx create-react-app mychat
$ cd mychat
$ npm i --save express graffy sqlite3
```

We'll be using `npm start` to start the React dev server for the client, which runs on port 3000. We'll run the chat server on port 5000, so we need to tell the React dev server to make it available to the client.

To do this, edit `package.json` and add:

```json
"proxy": "http://localhost:5000"`
```

## Hello, Graffy

Create a file `server.js` and add the following:

```js
const express = require('express');
const Graffy = require('graffy');
const GraffyServer = require('graffy/server');

const store = Graffy();
store.onRead(() => {
  hello: 'world';
});

const app = express();
app.use('/api', GraffyServer(g));
app.listen(5000);

console.log('Server started at 5000');
```

Run the server with `node server.js` and test it out by visiting http://localhost:5000/api?q=hello

The response should be:

```json
{ "hello": "world" }
```

## A place for data

Our data model will have two entities, users - with names and avatars - and messages - with text, timestamp and a link to the sender.

We'll write this as a Graffy module, `GraffyChat.js`. First, we will set up the database.

```js
// TODO
```

We'll also add some dummy users.

```js
```

First, we'll handle read requests.

```js
const users = {
  alice: { name: 'Alice', avatar: 'alice.png' },
  bob: { name: 'Bob', avatar: 'bob.png' },
};
const messages = {};

module.exports = store => {
  store.onRead('/users', () => users);
  store.onRead('/messages', () => messages);
};
```

Here, we're returning the full data hash to graffy and letting it extract the parts that are relevant to it. When we store data into an external database, onRead
