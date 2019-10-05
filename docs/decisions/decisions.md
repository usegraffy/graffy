# Ideas under consideration

## When should the "live" module resubscribe?

Option 1: Based on linkKnown. Whenever links are encountered, the query is expanded. The problem is when the backend provides automatic link-traversal in subscriptions, this results in unnecessary resubscribes. The benefit is that it is well-defined and not path-dependent.

Option 2: Based on unknown / extraneous. Expand the subscription when unknown values are encountered after putting data, contract it when extraneous values are discovered. The problem is that this conflates query and subscription, it is possible that a backend provides link traversal for query but not for subscription. We may end up not making a necessary subscription if the initial query returns with traversed data.

Consider:

- Perhaps combining "query link traversal" module with "live" module and adding it all into core (rather than as pluggable modules) will help?
- Perhaps providers can be required to be consistent between query and subscription (with respect to which links they can traverse and which they can't)?

## When a subscription's page bounds expand or contract, should that be communicated in change objects?

# Ideas that were considered

These could be reopened if there's new information.

## How to distinguish between a live query and a change susbcription.

In live queries, the first payload is the current state of the backend matching the query.

In change subscriptions, the first payload must be undefined.

## Should there be a separate onWatch() callback?

No: The onRead() handler receives a cancellation signal as argument. The signal is invoked when the subscriber leaves. The handler is expected to return the initial state and subsequently call graffy.write() whenever there are changes.

Yes: The onRead() handler is called for the initial state, AND the onWatch() handler is called for subscribing to future changes. The onWatch() handler returns a function that is invoked to request an unsubscribe.

Decision: No. We use onRead() with a cancellation signal.

## Should there be separate APIs for get, getRaw, sub, subRaw?

Alternately, only a single .read() with an options hash for `once` and `raw`.

Decision: Single .read().

## Should onRead handlers call next() or just return the payload and have the resolver call sprout() to decide whether to go to the next handler?

Decision: Handlers should explicitly call next(). This is because handlers may need to use the results of downstream handlers (e.g. to update cache).

We may provide helpers for common operations we're expecting handlers to perform.

## How should handlers on overlapping routes be handled?

Decision: The handler closest to the root will be called first; if it calls next(), then child handlers are called.

## Should handlers (onRead, onWrite) modify the query object before calling next(), should call next with new object?

Decision: New object. In most cases where it needs to modify, it will need the old object after downstream handlers have returned.

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
