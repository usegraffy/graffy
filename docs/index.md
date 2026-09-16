---
title: Home
---

# Introducing Graffy

Graffy is an open source library to serve and consume your app's data over deliciously fast and intuitive APIs. It runs on any JavaScript-based client or server environment, and supports:

- **Live queries** — Clients can say "give me this data now, and then let me know of changes as they happen."
- **Multiple data sources** — Supports PostgreSQL out of the box; custom providers are super easy to write.
- **Client-side state management** — Use a single library to seamlessly manage both client-side state and server-side data.
- **Resource expansion** — Fetch everything in one round trip, even if related objects are in different databases.
- **Optimistic writes** — Update the UI immediately on writes, without waiting for a server response.
- **Efficient pagination** — Uses scalable and efficient cursor-based pagination to deal with long lists of things.

All these things are *composable* and work seamlessly together.

> 🏗️ Graffy is still under heavy development; some of this stuff may not work yet.

## Overview

You use Graffy to build and access *stores* — an abstraction over some underlying storage mechanism, such as a database, a web server, event stream or just some objects in memory.

```javascript
const store = new Graffy();
```

Graffy stores can be deployed to a server for clients to access over HTTP or WebSockets. They also have an elegant JavaScript API for use within client or server code.

```javascript
const app = express();
app.use(graffyServer(store));
```

On the client, Graffy provides caching (with optional persistence and optimistic updates), manages real-time data streams from the server and provides a unified API for local and remote data.

```javascript
store.use(graffyClient('/api'));
store.read(query);
```

Graffy also has an idiomatic API for React and React Native users.

```javascript
const { data, loading, error } = useQuery(query);
```

## Learn Graffy

### Reference

- [Structures](reference/structures)
- [Attributes](reference/attributes)
- [Pagination](reference/pagination)
- [References](reference/references)
- [Versioning](reference/versioning)
- [Store API](reference/store-api)

### Guides

- [Patterns](guides/patterns)
- [Providers](guides/providers)

## Standard modules

- [**🧩 Cache**](https://www.npmjs.com/package/@graffy/cache) provides in-memory caching with optional optimistic updates
- [**🧩 Client**](https://www.npmjs.com/package/@graffy/client) provides access to data from a remote Graffy server
- [**🧩 Explore**](https://www.npmjs.com/package/@graffy/explore) React component providing debug access to a Graffy server
- [**🧩 Fill**](https://www.npmjs.com/package/@graffy/fill) performs recursive query resolution
- [**🧩 Link**](https://www.npmjs.com/package/@graffy/link) constructs links declared using an intuitive notation
- [**🧩 Memory**](https://www.npmjs.com/package/@graffy/memory) provides a simple in-memory store
- [**🧩 Postgres**](https://www.npmjs.com/package/@graffy/pg) connects PostgreSQL tables to Graffy
- [**🧩 React**](https://www.npmjs.com/package/@graffy/react) hooks and components for idiomatic Graffy use
- [**🧩 Server**](https://www.npmjs.com/package/@graffy/server) exposes a Graffy store over HTTP or Websockets

## Optional reading

- [Internals](internals/)

## Links

- [graffy.org](https://graffy.org)
- [github.com/usegraffy/graffy](https://github.com/usegraffy/graffy)
