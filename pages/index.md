import Demo from '@graffy/website/components/Demo';

# Sweet APIs!

Serve and consume your app’s data over deliciously fast, intuitive and expressive APIs.

Graffy runs on your JavaScript clients and Node.js or Deno servers, and supports:

1. **Live queries**<br />
   Clients can say “give me this data now, and then let me know any time it changes.”
1. **Data source agnostic**<br />
   Supports PostgreSQL out of the box; custom providers are super easy to write.
1. **Resource expansion**<br />
   Fetch everything in one round trip, even if related objects are in different databases.
1. **Cursor-based pagination**<br />
   The most scalable and efficient way to deal with long lists of things.
1. **Optimistic writes**<br />
   Boost perceived performance by updating UI immediately, without waiting for a server response.
1. **Client-side state management**<br />
   Use a single library to seamlessly manage both client-side state and server-side data.
1. **Super-powered caching**<br />
   Keeping track of pagination and resource expansion helps serve even more requests from the cache.

All these things are _composable_ and work seamlessly together.

# Basics

You use Graffy to build and access _stores_ — an abstraction over some underlying data source, such as a database, a remote server, or just some objects in memory.

```jsx
const store = new Graffy();
```

All the useful functionality — things like database access, making upstream queries, caching, authentication, etc. are provided by [_modules_](/reference/modules). The Graffy project maintains several useful ones, and it’s easy to write your own. This is how you _use_ a module:

```jsx
store.use('users', graffyPostgres(options));
```

There are two _consumer_ APIs, _read_ and _write_. Read accepts a [_query_](/reference/structs#query) — a JSON object representing a data requirement — and returns a stream (JavaScript AsyncIterable) of [_graphs_](/reference/structs#graph) — JSON objects containing the results and any subsequent updates to it.

```jsx
const stream = store.read(query);
for await (const value of stream) {
  process(value);
}
```

Write accepts a graph (conventionally called _change_) and returns a Promise that resolves when the change has been committed.

```jsx
await store.write(change);
```

There are two corresponding _provider_ APIs, _onRead_ and _onWrite_, that let you register functions to fulfill read and write requests in your custom modules. Your provider functions should accept queries or changes, and return AsyncIterables or Promises — the reverse of the corresponding consumer APIs.

Graffy stores can be deployed to a server for clients to access over HTTP or WebSockets. They also have an elegant JavaScript API for use _within_ client or server code. On the server this is useful to manage caching and to abstract away implementation details of the storage layer.

```jsx
const app = express();
app.use(graffyServer(store));
```

On the client, Graffy provides caching (with optional persistence and rapid “optimistic” updates), manages real-time data streams from the server and provides a unified API for local and remote data. Graffy also has an idiomatic API for React and React Native users.

```jsx
const { data, loading, error } = useQuery(query);
```

## Example

Let’s say you’re building a review app for books with years in the title, and you want to fetch the two oldest books in your database.

```js
const result = await store.read('books', {
  $key: { order: ['published'], first: 2 },

  title: 1,
  author: {
    name: 1,
  },
});
```

and the result:

```js
[
  {
    title: '1984',
    author: { name: 'George Orwell' },
  },
  {
    title: '2001: A space odyssey',
    author: { name: 'Arthur C Clarke' },
  },
];
```

Give Graffy a try! Change the data or query below.

<Demo />
