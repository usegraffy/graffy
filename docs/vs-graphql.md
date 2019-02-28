# Grue vs. GraphQL

## GraphQL shortcomings

- Live queries: Subscriptions are a poor fit for the typical use case where the client needs some data to be kept up-to-date with the server.

GraphQL queries encourage fetching deeply nested relations in one round trip, and for complex business logic to be delegated to the backend. On the other hand, subscriptions require the frontend to implement state transition logic, often duplicating what's already there on the server.

Some GraphQL frameworks implement live queries by resending the entire query result over the wire every time there's a change. This does not scale.

- Underspecified: The GraphQL specification covers only a small part of what is required to build real-world applications; pagination is specified in Relay, and there is no standard transport layer for Subscriptions making interoperable implementations difficult.

## Similarities

- Queries must specify the full set of required fields
- Queries can expand related entities several levels deep

## Differences

- All data is placed in a single tree with symlinks
- Every node has a canonical path in the tree
- Queries may request a range of keys in lexical order

Backend is a middleware framework similar to Express. Planned providers (middlware) include:

- Grue-Cache (which uses JS memory and works on both client and server)
- Grue-Schema (provides type validation and introspection endpoints)
- Grue-Http (communicates with an express-grue server)

Other planned modules:

- Express-Grue (express middleware that creates an HTTP and Websockets API)
- React-Grue (react components for making queries and subscriptions)
