import Demo from '@graffy/website/components/Demo';

# Bring your APIs a**live**

Graffy is a [live query](why/02-Live-Queries) library for the browser and Node.js. Graffy-powered servers fulfill each query with its initial result followed by a stream of relevant incremental updates. This is different ([and better!](why/03-vs-GraphQL)) than GraphQL subscriptions.

> `npm install @graffy/core`

Graffy supports complex, expressive live queries - with multiple levels of resource expansion and pagination, and is based on a novel application of [set theory and CRDTs](advanced/01-Theory) to the problem of efficiently synchronizing subsets of a graph across devices.

Give Graffy a try! Change the data or query below.

<Demo />

## Intuitive [data model](learn/01-Data-Model)

Graffy lets you think of all your data as a single global filesystem, parts of which are synced with clients.

Every scalar value (string, number) is a "file" in this virtual tree, each with its own unique path. Some values are "symbolic links" pointing to other paths in the filesystem - making the data model a graph rather than a tree.

Different parts of the graph can live on different databases and backend systems, just as (in Unix-like systems) different parts of the filesystem can live on different physical devices. Graffy lets you "mount" a _provider_ at any path in your data model.

For example, here's how a Graffy data model for a blog might look.

```js
┬ /
├─┬ users/
│ ├─┬ 1/
│ │ ├── name: 'Alice'
│ │ └── avatar: 👧
│ ├─┬ 2/
│ │ ├── name: 'Bob'
│ │ └── avatar: 👨
│ ╵
└─┬ posts/
  ├─┬  1/
  │ ├── title: 'Hello, World'
  │ └── author ➔ /users/2
  ├─┬  2/
  │ ├── title: 'Lorem Ipsum'
  │ └── author ➔ /users/1
  ╵
```

## Expressive queries

The Graffy query language has similar capabilities as GraphQL. In fact, Graffy will soon support writing queries using GraphQL syntax!

Graffy clients specify exactly the data they need - to each field - and they get just that. This has a lot of benefits, such as efficiency and observability. Queries can also "follow the graph" and fetch multiple linked resources in one round trip.

Graffy also has built-in, efficient pagination, avoiding the `edges`, `node` and `pageInfo` boilerplate of GraphQL.

For example, here is a query that might be used to render the latest 10 posts from the blog above:

```js
{
  posts: [ { last: 10 }, {
    title: true,
    author: {
      name: true,
      avatar: true
    }
  } ]
})
```

## Highly modular

Graffy providers can be _composed_ - i.e. providers can delegate to each other. This works just like the familiar middleware model used by Express or Koa, and allows authentication, validation, custom caches and resource limiting to be implemented easily and distributed as modules.

In fact, the core of Graffy is just a simple middleware framework; most of the functionality is provided by built-in modules like [@graffy/fill](https://www.npmjs.com/package/@graffy/fill) and [@graffy/cache](https://www.npmjs.com/package/@graffy/cache).

## Efficient bulk reads

Graffy's provider model can also perform efficient bulk reads from underlying data stores (for example by constructing optimized SQL queries with range operations, joins etc.). This is particularly hard, if not impossible, to do with GraphQL resolvers - making hacks like [dataloader](https://github.com/graphql/dataloader) necessary.
