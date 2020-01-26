# Graffy vs GraphQL?

GraphQL brings together a large number of good ideas, and Graffy shamelessly borrows many of them. Graffy is also heavily inspired by Falcor, a data fetching library by Netflix, as well as Firebase Realtime Database and RethinkDB.

Graffy has several advantages over GraphQL such as improved caching and a simpler data model, but the biggest one - and the reason for starting this project - is support for efficient, scalable **live queries**.

## Live queries vs subscriptions

Quite often, clients need to keep query results up-to-date as they change on the server. Polling is an obvious solution to this, but the latencies and resource usage make this infeasible for many use-cases.

Live queries are the friendliest solution to this - they are queries where the server, after returning the initial results, keeps pushing updates to those results as long as the client needs them.

Unfortunately, GraphQL does not provide an easy way to build them. [GraphQL rejected live queries](https://graphql.org/blog/subscriptions-in-graphql-and-relay/#why-not-live-queries), instead opting for subscriptions where clients listen to specific events separately from their queries. This makes it much harder to implement common UIs.

GraphQL justifies the decision by pointing out that live queries are very hard to implement on the server; this is true. Graffy solves this by combining data from separate "query" providers and "subscription" providers to provide live query interfaces to the frontend. This approach also allows sharding a Graffy backend for scalability.

To do this, Graffy uses data types that provide consistency guarantees and a wire protocol that can represent diffs, neither of which are available in GraphQL.

See a real-life comparison of the difference this makes on the client at the bottom of this page.

## Efficient bulk reads

Graffy providers can perform much more efficient bulk reads from underlying data stores, with much less code and complexity, than GraphQL resolvers.

Consider an example where we need to fetch a list of, say 30 posts, and also the user who wrote each post. A naive REST client might need to fetch the list of posts first, read the 30 author IDs and fetch each of them individually. This is called the N+1 problem, and GraphQL has famously solved it.

Or has it? A straightforward GraphQL implementation for this model, with a `Post` resolver and a `User` resolver, will actually end up recreating the N+1 problem at the database layer; the User resolver will be called 30 times.

This is why GraphQL recommends a separate timer-based hack, [dataloader](https://github.com/graphql/dataloader), to collect all those database queries together. This adds a lot of complexity, and is also fairly limited: in our example, the most efficient query might use a JOIN between the `posts` and `users` tables, but this isn't really possible with GraphQL.

In contrast, Graffy providers are passed subqueries that they can inspect instead of being called repeatedly. The `user` provider is invoked only once - with 30 user IDs as argument.

We could even go further: the posts provider might check that the query includes the `author` field, and could construct a query with a JOIN. This would then avoid invoking the user provider entirely.

## Modularity

Unlike GraphQL resolvers, Graffy providers can be _composed_ - i.e. providers can delegate to each other. This works just like the familiar middleware model used by Express or Koa, and allows authentication, validation, custom caches and resource limiting to be implemented easily and distributed as modules.

In fact, the core of Graffy is just a simple middleware framework; most of the functionality is provided by built-in modules like [@graffy/fill](https://www.npmjs.com/package/@graffy/fill) and [@graffy/cache](https://www.npmjs.com/package/@graffy/cache).

## Other differences

### Paths vs Types

Graffy lets you think of all your data as a single global filesystem, parts of which are synced with clients. This is familiar and intuitive, compared to the type-based mental model that GraphQL imposes.

On the other hand, GraphQL's type system is also helpful for automatic validation and self-documenting APIs. Graffy plans to have an _optional_ type system for these purposes, but it isn't ready yet.

### Pagination

Graffy also has built-in, efficient pagination, avoiding the `edges`, `node` and `pageInfo` boilerplate of the Relay cursor specification.

### Plain JS

Graffy queries look like GraphQL and have similar capabilities, but are written using plain JS and not a DSL. This eliminates the need for parsing at build-or runtime, and reduces tooling bloat.

### Versioning

Graffy's CRDT uses a monotonically increasing _version_ attribute on every node. This allows some advanced capabilities:

- Queries can specify a minimum version number - caches will ignore older data for that query, even if it's within the cache's expiry time. This is more flexible than, say, the `"network-only"` and `"cache-first"` fetch policies in Apollo.
- Updates can specify a last seen version number. If the data had changed since that version, the write will fail; this avoids inadvertently overwriting changes.

## Real-life comparison

Consider a really simple group chat app, where a chat might have a schema like:

```js
{
  name: 'Class of 2017',
  logs: [ ... ]
}
```

Say the app needs to display a page of log items (the full log might be huge), and the name of the group. Naturally, if any of these change, the UI should update in real time.

### Graffy version

```js
const stream = graffy.watch('/chats/123', {
  name: true,
  logs: [ { last: 50 }, { ... } ]
});

for await (const chat of stream) {
  render(chat);
  // Break out of this loop to unsubscribe.
}
```

Only updates to members and log items that are currently in view are sent by the server.

### GraphQL version

Doing this using GraphQL (this example uses Apollo) requires an enormous amount of code and business logic implemented on the frontend. Even then is slower than the Graffy version and susceptible to race conditions.

```js
// First, we get the initial state and render it.
const chat = (await client.query(gql`{
  chat(id: 123) {
    name
    logs(last: 50) {
      pageInfo {
        hasNextPage
        hasPreviousPage
      }
      edges {
        node {
          ...
        }
      }
    }
  }
}`)).chat;
render(chat);

// Now we subscribe to name changes
const nameSubscription = client.subscribe(gql`
  nameChanged(chatid: 123) { ... }
`).subscribe(({ nameChanged }) => {
  chat.name = nameChanged.newName;
  render(chat);
});

// Then, we need to subscribe to new chat messages and changes and deletion
// of existing messages (deliver status updates, edits). We also want to keep
// the page size constant, at 50 - to avoid having too few items visible, and
// to avoid having too many subscriptions open after a while.
const chatAddSubscription = client.subscribe(gql`
  messageAdded(chatid: 123) { ... }
`);
chatAddSubscription.subscribe(({ messageAdded }) => {
  chat.logs.push(messageAdded);
  subscribeToMessage(messageAdded.id);
  if (chat.logs.length > 50) {
    const oldest = chat.logs.unshift();
    unsubscribeFromMessage(oldest.id);
  }
  render(chat);
});

const msgUpdateSubscriptions = {};
const msgDeleteSubscriptions = {};

function subscribeToMessage(id) {
  if (!msgUpdateSubscriptions[id]) {
    msgUpdateSubscriptions[id] = client.subscribe(gql`
      messageUpdated(msgid: ${id}) { ... }
    `);
    msgUpdateSubscriptions[id].subscribe(({ messageUpdated }) => {
      const index = _.findIndex(chat.logs, item => id === item.id);
      chat.logs.splice(index, 1, messageUpdated);
    });
  }

  if (!msgDeleteSubscriptions[id]) {
    msgDeleteSubscriptions[id] = client.subscribe(gql`
      messageDeleted(msgid: ${id}) { ... }
    `);
    msgDeleteSubscriptions[id].subscribe(() => {
      const index = _.findIndex(chat.logs, item => id === item.id);
      unsubscribeFromMessage(id)
      chat.logs.splice(index, 1);
      if (chat.logs.length === 49) {
        // The length was previously 50, we need to fetch a new item
        // to make up for the one that got deleted.
        const before = chat.logs[0].id;
        const fetchedMessage = (await client.query(gql`
          chat(id: 123) {
            logs(last: 2, before: ${before}) {
              edges {
                node {
                  ...
                }
              }
            }
          }
        }`)).chat.logs.edges[0]?.node
        chat.logs.unshift(fetchedMessage);
        subscribeToMessage(fetchedMessage.id);
      }
    });
  }
}

function unsubscribeFromMessage(id) {
  msgUpdateSubscriptions[id].unsubscribe();
  msgDeleteSubscriptions[id].unsubscribe();
  delete msgUpdateSubscriptions[id];
  delete msgDeleteSubscriptions[id];
}

chat.logs.forEach(subscribeToMessage);

// Call this to unsubscribe
function unsubscribe() {
  chat.logs.forEach(({ id }) => unsubscribeFromMessage(id));
  nameSubscription.unsubscribe();
}
```
