# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Graffy is a graph-centric API toolkit comparable to GraphQL and Firebase, supporting live queries with real-time data synchronization. The codebase is built on set theory and CRDTs (Conflict-free Replicated Data Types) for efficient graph operations.

## Common Development Commands

```bash
# Testing
npm test                    # Run all tests
npm test -- --watch        # Watch mode
npm test -- src/core       # Test specific module

# Code Quality
npm run format              # Auto-fix formatting and linting (Biome)
npm run lint               # Check for linting issues (CI mode)

# Development
npm start                  # Start example server
npm run pg:clean          # Clean PostgreSQL test container
npm run pg:psql           # Start PostgreSQL for testing

# Build and Package
./scripts/package.js 1.0.0           # Build all packages
./scripts/package.js 1.0.0 --link    # Build and link locally
./scripts/package.js 1.0.0 --watch   # Watch mode for development
```

## Architecture

**Monorepo Structure**: Each directory in `src/` is a separate npm package under the `@graffy` scope with independent versioning. Packages depend on each other via `@graffy/*` imports.

**Core Modules**:

- `core`: Main request dispatch framework
- `graffy`: Meta-package combining core with defaults (Cache + Fill)
- `client`/`server`: EventStream/HTTP implementations
- `cache`: In-memory caching layer
- `fill`: Query fulfillment from multiple providers
- `common`: Shared utilities, coding/decoding, operations
- `react`: React hooks and components
- `pg`: PostgreSQL connector

**Middleware Pattern**: Graffy uses composable middleware-style providers:

```javascript
const store = new Graffy();
store.use(Fill(options));
store.use(Cache(options));
store.use("users", userProvider);
```

**Graph Data Model**:

- Path-based routing (`/users/123/profile`)
- Reference linking between nodes
- Cursor-based pagination
- CRDT-inspired atomic operations

## Testing Setup

**Framework**: Jest with ES modules support (`NODE_OPTIONS=--experimental-vm-modules`)
**Location**: Tests co-located in each module's `test/` directory
**Utilities**: Use `@graffy/testing` for common patterns and mock backends
**Database**: PostgreSQL integration tests use Docker containers

## Code Conventions

- **ES Modules**: All packages use `"type": "module"` with async/await patterns
- **Formatting**: Biome with single quotes, space indentation
- **Module Independence**: Each `src/` module should be independently testable and publishable
- **Provider Pattern**: Extend functionality through middleware-style providers
