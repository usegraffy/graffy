# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run all tests
npm test

# Run a single test file
NODE_ENV=testing node --test --experimental-test-module-mocks \
  --import ./scripts/node-test-setup.js src/cache/cache.test.js

# Run react tests (needs jsdom setup)
npm run test:react

# Lint (CI mode, no auto-fix)
npm run lint

# Format (auto-fix)
npm run format

# Start example server
npm start:example

# Package/publish
./scripts/package.js <version> [--publish] [--link]
```

## Testing infrastructure

Tests use the **Node.js built-in test runner** (`node:test`) — Jest has been removed.

- Test files are named `*.test.js` (not `*.test.js`)
- Imports: `import { describe, test, it, before, after, beforeEach, afterEach, mock } from 'node:test'` and `import assert from 'node:assert/strict'`
- Assertions use `assert.*` instead of `expect(...)`:
  - `assert.strictEqual(a, b)` — replaces `expect(a).toBe(b)`
  - `assert.deepStrictEqual(a, b)` — replaces `expect(a).toEqual(b)`
  - `assert.ok(expr)` — replaces `expect(expr).toBeTruthy()`
  - `assert.rejects(fn)` — replaces `expect(fn).rejects.toThrow()`
- Mocks use `mock.fn()` / `mock.method()` instead of `jest.fn()` / `jest.spyOn()`
  - `mock.fn().mock.calls[i].arguments[j]` — note `.arguments`, not `[j]` directly
  - `mock.fn().mock.callCount()` — replaces `.mock.calls.length`
  - `mock.method(obj, 'name')` — replaces `jest.spyOn(obj, 'name')`
- Module mocking uses `await mock.module('./Foo.js', { exports: { ... } })` with `--experimental-test-module-mocks`
- Fake timers: `mock.timers.enable([...])` / `mock.timers.tick(n)` / `mock.timers.reset()`
- The react test runs separately via `npm run test:react` with `scripts/jsdom-setup.js` providing a DOM environment

**`--test-concurrency=1`** is set in `test:node` because Node <24.15 has a bug where `mock.module` fails in concurrent worker threads.

## Architecture

Graffy is a **graph-centric API toolkit** — a monorepo of 16 packages under `src/*/`, each published as `@graffy/<name>` on NPM.

### Core Data Flow

Requests (read/watch/write) flow through a **middleware chain** registered on a `Graffy` store instance. Each handler receives `(query, options, next)` and can intercept, modify, or delegate to `next`.

```
Client → @graffy/client → HTTP/WS → @graffy/server → Graffy store
                                                          ↓
                                              middleware chain (cache → fill → pg/memory)
```

### Key Packages

- **`@graffy/core`** — The `Graffy` class. Implements `use()`, `onRead()`, `onWatch()`, `onWrite()`, and the path-based handler registry with `resolve()` dispatch.
- **`@graffy/fill`** — Query fulfillment engine. Recursively satisfies queries from multiple providers, traverses graph links, and converts subscriptions to live queries. Default max recursion: 10.
- **`@graffy/cache`** — In-memory caching layer with time-based expiry (default 60s) and optimistic update support.
- **`@graffy/common`** — Shared graph primitives used across all packages: encoding/decoding queries, graph operations (`merge`, `slice`), node utilities, and stream helpers.
- **`@graffy/pg`** — PostgreSQL data source. Builds SQL from graph queries; handles filter operations with injection prevention.
- **`@graffy/client`** — HTTP (`httpClient.js`) and WebSocket (`wsClient.js`) transports. Transport is selected by URL scheme.
- **`@graffy/server`** — Node.js HTTP and WebSocket server handlers compatible with Express.
- **`@graffy/react`** — React 19 bindings: `GraffyContext`, `useQuery` hook, `Query` render-prop component.
- **`@graffy/testing`** — Test helpers: `mockBackend`, `put`, `ref`, `key`, `page`, pretty-printing.

### Data Model

- Queries and results are **encoded graphs** (tree of objects keyed by path segments).
- `@graffy/common/coding/` handles encoding/decoding between user-facing objects and internal wire format.
- `@graffy/common/ops/` implements set-theory-based graph operations (merge, slice, etc.).
- Watch operations return **AsyncIterables** for real-time subscriptions.

### Toolchain

- **Biome** — Unified linter + formatter (replaces ESLint/Prettier). Config in `biome.json`.
- **`node:test`** — Built-in test runner. Test files are `*.test.js`. Setup file: `scripts/node-test-setup.js`. React test uses `scripts/jsdom-setup.js`.
- **Vite** — Used for the frontend example/explore packages.
- **Yarn workspaces** — Links packages together during development.
- **CI** — GitHub Actions runs on Node 20, 22, 24; includes Playwright for E2E tests.
