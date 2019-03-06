# Ideas under consideration

## When a subscription's page bounds expand or contract, should that be communicated in change objects?

## Should all metadata be grouped under one key?

## Should ranges and filters be encoded into one key?

TODO: Write rationale

Decision: Yes

# Ideas that were considered

These could be reopened if there's new information.

## Should cached data be stored as a graph (with path metadata) or a tree with symlinks?

Pros:
  - Prune, Sprout become much simpler as they don't need to follow links
  - As an optimization in production, don't prune

Cons:
  - When a section of the graph is created or deleted, incoming links to that section may need updating. This is very complex, and was the blocker.
  - Not pruning in production is not feasible; users might iterate over children.

Decision: Keep cached data in a tree with symlinks

## Should Grue Server have full REST compatibility?

This would require:
- returning just the branch at path, rather than sparse trees from the root
- converting range results into arrays

Cons:
- Returning the branch at path will require links to be grafted / resolved; this causes duplication if multiple links point to the same path.

Decision: Keep a GraphQL/Falcor-like single URL for all requests.
