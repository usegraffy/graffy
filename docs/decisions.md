# Ideas under consideration

## When a subscription's page bounds expand or contract, should that be communicated in change objects?

## Should all metadata be grouped under one key?

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

## Should Graffy Server have full REST compatibility?

This would require:
- returning just the branch at path, rather than sparse trees from the root
- converting range results into arrays

Cons:
- Returning the branch at path will require links to be grafted / resolved; this causes duplication if multiple links point to the same path.

Decision: Keep a GraphQL/Falcor-like single URL for all requests.

## Should ranges and filters be encoded into one key?

No reason not to, this would decrease one level of nesting in indexes.

Decision: Yes

_Currently not implemented._

## Should raw subscriptions explicitly remove items that are no longer tracked?

When using a range query, insertions into the page will result in the last element(s) going out of range. When this happens the backend will no longer send updates to those elements. Should the backend send an update setting those as `null` so the frontend does not expect them to still be up-to-date?

- `null` represents deletions
- The frontend can figure out what is tracked anyway, without the backend sending explicit removals.

Decision: No.

## Should raw subscriptions send page bounds changes?

When the range of objects tracked by a subscription changes because of an insertion or deletion, should the backend (1) explicitly send the updated page bounds, (2) send the increase or decrease in range, (3) do nothing

1. is inconsistent with how page info is currently merged by the client (union, not replace). It might not be able to send this.

2. this will require a new format to represent negative page bounds (when it shrinks due to an insertion).

Decision: Do nothing, the consumer can figure this out.

_Currently positive page bound increases are sent but decreases are not._
