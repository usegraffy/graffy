Implement:
- Page Info
- Put
- Mutations and events
- Revisit API
- Key encoding helpers: numbers, ranges
- Cache
- Schema

- Add timestamps (vector?) to results and payloads

Fix:
- Rename Token to Signal
- Move refs to __ref__


Get Options
- Live: Subscribe to changes rather returning a one-time result
- keepLinks: Leave links as atoms rather than fetching the remote
  [Unnecessary if we switch to __ref__?]
- values: Get a full object every time something changes


Primary API:
- get
- sub
- put


Provider API

- getRaw: Preserve links
- subRaw: Changes only, preserve links
- onGet
- onPut
- pub: Publish


Write articles:

  References:
    - https://edgecoders.com/the-falcor-data-model-is-a-graph-and-the-graphql-data-model-is-a-tree-6748ba53bb96
    - https://blog.apollographql.com/graphql-vs-falcor-4f1e9cbf7504
    - https://www.meteor.com/articles/graphql-vs-falcor
