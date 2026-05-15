# Jest → Node.js Built-in Test Runner Migration

## Context

The project uses Jest 30 + `--experimental-vm-modules` for ESM. Node.js 24.15.0 (in use) ships `node:test` natively. The goal is to drop Jest and run tests with `node --test`, using `node:assert` instead of `expect` and native `mock.fn()` / `mock.method()` instead of a compatibility shim.

The migration is split into phases, each renaming files to `.nodetest.js` on completion. The `package.json` test script runs both runners during the transition so CI passes throughout.

---

## API mapping reference

### assert (node:assert/strict) ← replaces expect

| Jest | node:assert |
|------|-------------|
| `expect(a).toBe(b)` | `assert.strictEqual(a, b)` |
| `expect(a).toEqual(b)` | `assert.deepStrictEqual(a, b)` |
| `expect(a).toStrictEqual(b)` | `assert.deepStrictEqual(a, b)` |
| `expect(a).not.toBe(b)` | `assert.notStrictEqual(a, b)` |
| `expect(a).not.toEqual(b)` | `assert.notDeepStrictEqual(a, b)` |
| `expect(a).toBeTruthy()` | `assert.ok(a)` |
| `expect(a).toBeFalsy()` | `assert.ok(!a)` |
| `expect(a).toBeNull()` | `assert.strictEqual(a, null)` |
| `expect(a).toBeUndefined()` | `assert.strictEqual(a, undefined)` |
| `expect(a).toMatch(re)` | `assert.match(a, re)` |
| `expect(a).toContain(b)` | `assert.ok(a.includes(b))` |
| `expect(a).toBeLessThan(b)` | `assert.ok(a < b)` |
| `expect(a).toBeGreaterThan(b)` | `assert.ok(a > b)` |
| `expect(a).toHaveProperty(k, v)` | `assert.strictEqual(a[k], v)` (or deepStrictEqual for nested) |
| `expect(a).not.toHaveProperty(k)` | `assert.ok(!(k in a))` |
| `expect(a).toMatchObject(sub)` | iterate: `for ([k,v] of Object.entries(sub)) assert.deepStrictEqual(a[k], v)` |
| `expect(a).toEqual(expect.any(Function))` | `assert.ok(typeof a === 'function')` |
| `expect(a).toEqual(expect.any(String))` | `assert.ok(typeof a === 'string')` |
| `expect(a).toEqual(expect.any(Number))` | `assert.ok(typeof a === 'number')` |
| `expect(a).toEqual(expect.any(Object))` | `assert.ok(a !== null && typeof a === 'object')` |

### mock (node:test) ← replaces jest.fn() / jest.spyOn()

**Shape difference — the critical one:**
- Jest: `fn.mock.calls[i]` → `[arg0, arg1, ...]` (plain array)
- node:test: `fn.mock.calls[i]` → `{ arguments: [arg0, arg1, ...], result, error, this, target }`
- Jest: `fn.mock.results[i].value` → the return value
- node:test: `fn.mock.calls[i].result` → same thing

| Jest | node:test |
|------|-----------|
| `jest.fn()` | `mock.fn()` |
| `jest.fn(impl)` | `mock.fn(impl)` |
| `jest.fn().mockReturnValue(v)` | `mock.fn(() => v)` |
| `jest.fn().mockResolvedValue(v)` | `mock.fn(async () => v)` |
| `fn.mock.mockReturnValueOnce(v)` | `fn.mock.mockImplementationOnce(() => v)` |
| `fn.mock.mockResolvedValueOnce(v)` | `fn.mock.mockImplementationOnce(async () => v)` |
| `fn.mock.mockImplementation(i)` | `fn.mock.mockImplementation(i)` |
| `fn.mock.mockImplementationOnce(i)` | `fn.mock.mockImplementationOnce(i)` ⚠️ LIFO (see note) |
| `fn.mockClear()` | `fn.mock.resetCalls()` |
| `fn.mock.calls[i][j]` | `fn.mock.calls[i].arguments[j]` |
| `fn.mock.results[i].value` | `fn.mock.calls[i].result` |
| `jest.spyOn(obj, 'method')` | `mock.method(obj, 'method')` |
| `spy.mockRestore()` | `spy.mock.restore()` |

⚠️ **`mockImplementationOnce` is LIFO** in Node, not a queue. Two consecutive calls to `mockImplementationOnce` results in the last one winning. If a test needs to queue multiple once-overrides, use a counter-based closure:
```js
const responses = [first, second, third];
let i = 0;
const fn = mock.fn(() => responses[i++] ?? defaultVal);
```

**Mock assertions:**
```js
// jest:
expect(fn).toHaveBeenCalled()
expect(fn).toHaveBeenCalledTimes(n)
expect(fn).toHaveBeenCalledWith(a, b)

// node:test + assert:
assert.ok(fn.mock.callCount() > 0)
assert.strictEqual(fn.mock.callCount(), n)
assert.deepStrictEqual(fn.mock.calls.at(-1).arguments, [a, b])
```

### jest.useFakeTimers → mock.timers

```js
// jest:
jest.useFakeTimers();
jest.advanceTimersByTime(n);
jest.clearAllTimers();
jest.useRealTimers();

// node:test:
mock.timers.enable(['Date', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'setImmediate', 'clearImmediate']);
mock.timers.tick(n);
mock.timers.reset();  // clears pending timers AND restores real timers
```

### jest.unstable_mockModule → mock.module

```js
// jest (sync factory, auto-hoisted before imports):
import { jest } from '@jest/globals';
jest.unstable_mockModule('./Socket', () => ({
  default: jest.fn(() => ({ start: jest.fn() })),
}));
const { default: client } = await import('./index.js');

// node:test (awaitable, explicit order, explicit .js extension):
import { mock } from 'node:test';
await mock.module('./Socket.js', {
  exports: { default: mock.fn(() => ({ start: mock.fn() })) },
});
const { default: client } = await import('./index.js');
```
Requires `--experimental-test-module-mocks` flag.

### test runner structure

```js
// All test files must import from node:test — these are NOT globals:
import { describe, test, it, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
// Remove: import { jest } from '@jest/globals';

// jest.setTimeout(n) → per-test timeout option:
test('name', { timeout: n }, async () => { ... });

// test.each(cases)('label', fn) → for-loop:
for (const [a, b] of cases) {
  test(`label a:${JSON.stringify(a)} b:${JSON.stringify(b)}`, async () => { ... });
}

// describe.each(['a', 'b'])('%s', fn) → for-loop:
for (const label of ['a', 'b']) {
  describe(label, () => { ... });
}
```

---

## Dual-runner setup (packages.json scripts)

During migration, both runners coexist:

```json
"test": "npm run test:node && npm run test:jest",
"test:node": "NODE_ENV=testing node --test --experimental-test-module-mocks --import ./scripts/node-test-setup.js 'src/**/*.nodetest.js'",
"test:jest": "NODE_OPTIONS=--experimental-vm-modules NODE_ENV=testing jest"
```

`jest.config.cjs` already uses `rootDir: 'src'` and picks up `*.test.js` files. The `.nodetest.js` extension is excluded from Jest automatically since `testMatch` defaults don't include it.

When all files are migrated, remove `test:jest` and update `jest.config.cjs` (or delete it).

---

## Plan file in the repo

Create `TEST_MIGRATION.md` at the repo root tracking phase completion. Each phase header can be checked off as work is done. This allows the migration to resume across sessions.

---

## Phases

### Phase 0 — Infrastructure (no test file changes)

1. Copy `scripts/jest.setup.js` → `scripts/node-test-setup.js` (content is already correct)
2. Update `package.json` scripts to dual-runner mode (above)
3. Create `TEST_MIGRATION.md` in the repo root with this plan summary

Files modified: `package.json`, `scripts/node-test-setup.js` (new), `TEST_MIGRATION.md` (new)

---

### Phase 1 — common/coding tests (9 files, no mocks)

Files: `common/coding/test/*.test.js` → rename each to `.nodetest.js`

Changes per file: add imports at top, no other changes:
```js
import { describe, test, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
```
Replace `expect(a).toEqual(b)` with `assert.deepStrictEqual(a, b)` throughout, and so on per the mapping table. Rename to `.nodetest.js`.

---

### Phase 2 — common/node and common/ops tests (10 files, no mocks)

Files: `common/node/test/*.test.js`, `common/ops/test/*.test.js` → rename to `.nodetest.js`

Same as Phase 1.

---

### Phase 3 — simple pure-logic tests (7 files, no mocks)

Files:
- `fill/broken.test.js`, `fill/index.test.js`
- `link/linkGraph.test.js`, `link/prepQueryLinks.test.js`
- `memory/memory.test.js`
- `core/test/validate.test.js`, `core/test/watch.test.js`

Same as Phase 1.

---

### Phase 4 — pg and clickhouse SQL/filter tests (7 files, no mocks)

Files:
- `pg/test/filter/getAst.test.js`, `pg/test/filter/getSql.test.js`
- `pg/test/sql/clauses.test.js`, `pg/test/sql/select.test.js`, `pg/test/sql/upsert.test.js`
- `clickhouse/test/filter/getSql.test.js`, `clickhouse/test/sql/select.test.js`

Same as Phase 1.

---

### Phase 5 — mock.fn() only tests (7 files)

Files: `cache/cache.test.js`, `core/test/read.test.js`, `core/test/ref.test.js`, `core/test/routing.test.js`, `core/test/write.test.js`, `fill/fill.test.js`, `link/link.test.js`

In addition to Phase 1 changes:
```js
// Remove:
import { jest } from '@jest/globals';
// Add:
import { mock } from 'node:test';

// Replace:
jest.fn(impl) → mock.fn(impl)
jest.fn().mockReturnValue(v) → mock.fn(() => v)
jest.fn().mockResolvedValue(v) → mock.fn(async () => v)
jest.spyOn(obj, 'm') → mock.method(obj, 'm')
```

For `fn.mock.calls[i][j]` patterns (core/test/ref.test.js):
```js
// Before: postProvider.mock.calls[0][0]
// After:  postProvider.mock.calls[0].arguments[0]
```

For mock assertions use the patterns in the table above.

Note: `jest.config.cjs` has `restoreMocks: true` — add `afterEach(() => mock.restoreAll())` to any file using `mock.method()`.

---

### Phase 6 — core/test/porcelain.test.js (mock.fn + test.each)

File: `core/test/porcelain.test.js`

Same as Phase 5 for mock.fn changes, plus replace `test.each`:

```js
// Before:
test.each(cases)('read nextChanged:%j retChanged:%j', async (nextChanged, retChanged) => { ... });

// After:
for (const [nextChanged, retChanged] of cases) {
  test(`read nextChanged:${JSON.stringify(nextChanged)} retChanged:${JSON.stringify(retChanged)}`,
    async () => { ... });
}
```

Apply to both the `read` and `write` `test.each` blocks.

Also fix the `.mock.calls[0][0].$key` → `.mock.calls[0].arguments[0].$key` access.

---

### Phase 7 — fake timers tests (3 files)

Files: `client/Socket.test.js`, `server/httpServer.test.js`, `server/wsServer.test.js`

In addition to Phase 5 changes, replace fake timer APIs per the mapping table.

**`client/Socket.test.js`** — `MockWebSocket` uses class field `jest.fn()`:
```js
// Before:
class MockWebSocket {
  send = jest.fn();
  close = jest.fn();
}

// After (create new mocks per-instance):
class MockWebSocket {
  constructor() {
    this.send = mock.fn();
    this.close = mock.fn();
    MockWebSocket.instances.push(this);
  }
}
```

Then `ws.close.mock.calls.length` → `ws.close.mock.callCount()`.

**`server/httpServer.test.js`** — uses `store.call.mock.calls[0]` pattern:
```js
// Before: const [, , options] = store.call.mock.calls[0];
// After:  const [, , options] = store.call.mock.calls[0].arguments;
```

**`server/wsServer.test.js`** — also has `mock.module` (handle in Phase 8).

---

### Phase 8 — mock.module tests (5 files)

Files: `client/client.test.js`, `server/wsServer.test.js`, `pg/test/db/dbRead.test.js`, `pg/test/db/dbWrite.test.js`, `clickhouse/test/db/dbRead.test.js`

Apply mock.module rewrite pattern from the mapping table. Key points:
- Use explicit `.js` extension in `mock.module()` path
- `await mock.module(...)` must precede the `await import(...)` of the mocked module
- Replace factory function with `{ exports: { ... } }` shape

**`client/client.test.js`** additional changes:
1. Replace `describe.each(['httpClient', 'async httpClient'])('%s', fn)` with a for-loop
2. `MockSocket.mock.results[results.length - 1].value` → `MockSocket.mock.calls.at(-1).result`
3. `calls[calls.length - 1][1]` → `calls.at(-1).arguments[1]`
4. `globalThis.fetch = jest.fn().mockResolvedValue({...})` → `globalThis.fetch = mock.fn(async () => ({ ... }))`
5. `fetch.mockClear()` → `globalThis.fetch.mock.resetCalls()`
6. `fetch.mock.calls[0][0]` → `globalThis.fetch.mock.calls[0].arguments[0]`

**`pg/test/db/dbRead.test.js`** additional changes:
- `mockQuery.mockReset()` → `mockQuery.mock.resetCalls()` then `mockQuery.mock.mockImplementation(() => Promise.resolve({ rowCount: 0, rows: [] }))` (restore default)
- `mockQuery.mockReturnValueOnce({...})` → `mockQuery.mock.mockImplementationOnce(() => ({...}))`
- `mockQuery.mock.calls[0][0]` → `mockQuery.mock.calls[0].arguments[0]`

**`pg/test/db/dbWrite.test.js`**:
- `mockQuery.mockClear()` → `mockQuery.mock.resetCalls()`
- `mockQuery.mockResolvedValueOnce({...})` → `mockQuery.mock.mockImplementationOnce(async () => ({...}))`
- `mockQuery.mock.calls[0][0]` → `mockQuery.mock.calls[0].arguments[0]`

**`clickhouse/test/db/dbRead.test.js`**:
- `mockQuery.mockReset()` → `mockQuery.mock.resetCalls()` + `mockQuery.mock.mockImplementation(defaultImpl)`
- `mockQuery.mockResolvedValueOnce({...})` → `mockQuery.mock.mockImplementationOnce(async () => ({...}))`
- Update `getSqlFromCall(call)` helper: `const [args] = call;` → `const [args] = call.arguments;`
- `getSqlFromCall(mockQuery.mock.calls[0])` — no change to call site, just helper internals

---

### Phase 9 — e2e and example timeout tests (3 files)

Files: `example/example.test.js`, `pg/test/e2e.test.js`, `clickhouse/test/e2e.test.js`

Remove `import { jest } from '@jest/globals'` and `jest.setTimeout(n)`. Add `{ timeout: n }` to each test:

```js
// Before:
jest.setTimeout(120000);
test('exampleWs', async () => { ... });

// After:
test('exampleWs', { timeout: 120000 }, async () => { ... });
```

---

### Phase 10 — react test (1 file, requires jsdom + createElement)

File: `react/react.test.jsx` → `react/react.nodetest.js`

**Step 1**: Rewrite `src/react/GraffyContext.jsx` → `src/react/GraffyContext.js` eliminating JSX:
```js
// Before (JSX):
export function GraffyProvider({ store, children }) {
  return <GraffyContext.Provider value={store}>{children}</GraffyContext.Provider>;
}

// After (createElement):
import { createElement } from 'react';
export function GraffyProvider({ store, children }) {
  return createElement(GraffyContext.Provider, { value: store }, children);
}
```
Update all imports of `GraffyContext.jsx` in source to `GraffyContext.js`.

**Step 2**: Rewrite `react.test.jsx` → `react.nodetest.js` with:
```js
import { createElement } from 'react';
// ...
wrapper = function _Wrapper({ children }) {
  return createElement(GraffyProvider, { store: g }, children);
};
```

**Step 3**: Set up jsdom for this test. Create `scripts/jsdom-setup.js`:
```js
import { JSDOM } from 'jsdom';
const { window } = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost/',
});
for (const key of ['document', 'window', 'navigator', 'location', 'history', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame', 'HTMLElement']) {
  global[key] = window[key];
}
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
```
Note: `jsdom` must be available; it comes in via `jest-environment-jsdom`. If it's not importable directly, add `jsdom` as a direct devDependency.

**Step 4**: Add `test:react` script:
```json
"test:react": "NODE_ENV=testing node --test --import ./scripts/jsdom-setup.js src/react/react.nodetest.js"
```

**Step 5**: Replace `jest.fn(backend.read)` with `mock.method(backend, 'read')`. Update mock assertions.

**Step 6**: Remove `jest.config.cjs` docblock `@jest-environment` comment (no longer needed).

---

### Phase 11 — Cleanup

Once all 54 files are migrated:
1. Update `package.json`: rename `test:node` → `test`, remove `test:jest`
2. Delete: `jest.config.cjs`, `scripts/jestBabelTransform.js`, `scripts/jestDomEnvironment.cjs`
3. Remove from devDependencies: `jest`, `jest-environment-jsdom`, `@types/jest`, `@babel/preset-react` (if no longer needed), `babel-jest`
4. Keep: `@playwright/test` (used in `example/example.test.js`)
5. Update `TEST_MIGRATION.md` to mark complete

---

## Critical files

| File | Change |
|------|--------|
| `package.json` | Dual-runner scripts |
| `scripts/node-test-setup.js` | New (copy of jest.setup.js) |
| `TEST_MIGRATION.md` | New — tracks phase completion |
| `src/react/GraffyContext.jsx` → `.js` | Remove JSX (Phase 10) |
| `scripts/jsdom-setup.js` | New (Phase 10) |
| All 54 test files | Per-phase API changes + rename to `.nodetest.js` |
| `jest.config.cjs` | Delete (Phase 11) |

## Verification per phase

After each phase, run:
```bash
npm test  # both runners pass
```

After Phase 11:
```bash
NODE_ENV=testing node --test --experimental-test-module-mocks \
  --import ./scripts/node-test-setup.js 'src/**/*.nodetest.js'
```
