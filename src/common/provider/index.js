/*
  Constructs standard providers.

  Does the following:

  1. Coding: Encodes and decodes data structures
  2. Shifting: Wraps and unwraps to the provider path
  3. Finalizing: Fill gaps; this is the authoritative source. Option
  4. Debouncing: Aggregate operations within an event loop tick
  5. Linker: Spawn secondary operations if the provider returns links
  6. Fetcher: Read only. Provides the initial value only. Can be configured to:
      - yield to subsequent change providers, and/or
      - poll for changes
  7. Watcher: Read only. Combine all ongoing watch queries into one


*/

export default function provider(options) {
  const { finalize, links, fetch, watch } = options;
}
