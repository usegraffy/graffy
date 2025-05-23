import type {
  AnyFunction,
  AnyLeaf,
  AnyObject,
  AnyValue,
  GraffyCollection,
  GraffyRecord,
  GraffyTree,
  Key,
} from './basic';

import type { Descend, Nest, PathOf } from './path';

type AnyProjection =
  | boolean
  | { $key: Key }
  | { [key: string]: AnyProjection }
  | AnyProjection[];

// The parameter should be the Schema of the entire store. Use the "GraffyCollection"
// type to define the schema of a collection.
export default class Graffy<S> {
  read<P extends PathOf<S>, Q extends AnyProjection>(
    path: P,
    projection: Q,
    options?: GraffyReadOptions,
  ): Promise<Descend<S, P>>; // ReadResult<Descend<S, P>, Q>>;

  read<Q extends AnyProjection>(
    projection: Q,
    options?: GraffyReadOptions,
  ): Promise<S>; // ReadResult<S, Q>>;

  // Generic mode, when the path is not known at compile time, but projection is.
  read<Q extends AnyProjection>(
    path: string | Key[],
    projection: Q,
    options?: GraffyReadOptions,
  ): Promise<S>; // BlindReadResult<Q>>;

  // Consider also:
  // 1. Read when path is known at compile time but projection is not?
  // 2. Read when neither path nor projection is known at compile time?

  on: AnyFunction;
  call: AnyFunction;
  use: AnyFunction;
  onRead: AnyFunction;
  onWrite: AnyFunction;
  onWatch: AnyFunction;
  write: AnyFunction;
  watch: AnyFunction;

  static unchanged: symbol;
}

export type Project<S> = Nest<true, PathOf<S>>;

export type {
  AnyObject,
  Descend,
  PathOf,
  GraffyCollection,
  GraffyRecord,
  GraffyTree,
  Key,
};

// S extends AnyLeaf
//   ? boolean
//   : S extends GraffyCollection<infer R>
//     ?
//         | { [key: string]: Project<R> } //  Object form
//         | (Project<R> & { $key: Key }) //   Single $key
//         | (Project<R> & { $key: Key })[] // Array $key
//     : S extends AnyObject
//       ? 'string' extends keyof S // No named properties?
//         ? AnyProjection
//         : Partial<{ [K in keyof S]: Project<S[K]> }> | boolean
//       : never;

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
type ResultArray<R> = R[] & { $page: any; $next: any; $prev: any };

type ReadResult<S, Q> = S extends GraffyCollection<infer R>
  ? Q extends Array<infer QItem>
    ? ResultArray<PlainReadResult<R, QItem> & { $key: Key }> // Array $key
    : Q extends { $key: Key }
      ? Q extends { $key: string }
        ? { [key in Q['$key']]: PlainReadResult<S, Q> }
        : ResultArray<PlainReadResult<R, Q> & { $key: Key }> //   Single $key
      : { [K in keyof Q]: PlainReadResult<R, Q[K]> } //         Object form
  : PlainReadResult<S, Q>;

// Ignore $key in Q
type PlainReadResult<S, Q> = Q extends AnyObject
  ? { [K in keyof S & keyof Q]: ReadResult<S[K], Q[K]> }
  : S;

// What can we tell about ReadResult when schema isn’t known?
type BlindReadResult<Q> = Q extends Array<infer QItem>
  ? ResultArray<BlindPlainReadResult<QItem>>
  : Q extends { $key: Key }
    ? Q extends { $key: string }
      ? { [key in Q['$key']]: BlindPlainReadResult<Q> }
      : ResultArray<BlindPlainReadResult<Q>>
    : BlindPlainReadResult<Q>;

// Ignore $key in Q
type BlindPlainReadResult<Q> = Q extends AnyObject
  ? { [K in keyof Q]: BlindReadResult<Q[K]> }
  : AnyValue;

type GraffyReadOptions = AnyObject;

type UsedStoreSchema = Graffy<{
  Activity: GraffyCollection<{ id: string; name: string }>;
}>;

type G = UsedStoreSchema['read'];
