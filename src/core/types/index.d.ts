export type AnyLeaf = string | number | boolean | null;

// biome-ignore lint/suspicious/noExplicitAny: This is used to match concrete types in "extends" expressions.
export type AnyObject = Record<string, any>;

// biome-ignore lint/suspicious/noExplicitAny: Function for which types are not yet defined.
type AnyFunction = (...args: any[]) => any;

// biome-ignore lint/suspicious/noExplicitAny: Keys can be anything.
export type Key = any;
export type RangeKey =
  | { $all: boolean }
  | { $first: number }
  | { $last: number };

// biome-ignore lint/suspicious/noExplicitAny: Any value is for results.
type AnyValue = any;

type AnyProjection =
  | boolean
  | { $key: Key }
  | { [key: string]: AnyProjection }
  | AnyProjection[];

export type GraffyCollection<CollectionSchema extends AnyObject> = {
  [name: string]: CollectionSchema;
} & { __brand: 'GraffyCollection' };

// The parameter should be the Schema of the entire store. Use the "GraffyCollection"
// type to define the schema of a collection.
export default class Graffy<S> {
  read<P extends PathOf<S>, Q extends Project<Descend<S, P>>>(
    path: P,
    projection: Q,
    options?: GraffyReadOptions,
  ): Promise<ReadResult<Descend<S, P>, Q>>;

  read<Q extends Project<S>>(
    projection: Q,
    options?: GraffyReadOptions,
  ): Promise<ReadResult<S, Q>>;

  // Generic mode, when the path is not known at compile time, but projection is.
  read<Q extends AnyProjection>(
    path: string | Key[],
    projection: Q,
    options?: GraffyReadOptions,
  ): Promise<BlindReadResult<Q>>;

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
}

// TODO: To avoid the "too deep" error, these need to be tail-recursive.
// This may be possible with an "accummulator" type parameter.
// https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-5.html#tail-recursion-elimination-on-conditional-types

export type PathOf<S> = S extends GraffyCollection<AnyObject>
  ? Key
  : S extends AnyObject
    ? keyof S | [keyof S, ...PathOf<S[keyof S]>[]]
    : never;

type Get<S, K> = S extends GraffyCollection<AnyObject>
  ? S[string]
  : K extends keyof S
    ? S[K]
    : never;

export type Descend<S, P> = P extends [Key]
  ? Get<S, P[0]>
  : P extends [Key, ...infer R]
    ? Descend<Get<S, P[0]>, R>
    : Get<S, P>;

export type Project<S> = S extends AnyLeaf
  ? boolean
  : S extends GraffyCollection<AnyObject>
    ?
        | { [key: string]: Project<S[string]> } //  Object form
        | (Project<S[string]> & { $key: Key }) //   Single $key
        | (Project<S[string]> & { $key: Key })[] // Array $key
    : S extends AnyObject
      ? 'string' extends keyof S // No named properties?
        ? AnyProjection
        : Partial<{ [K in keyof S]: Project<S[K]> }> | boolean
      : never;

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
type ResultArray<R> = R[] & { $page: any; $next: any; $prev: any };

type ReadResult<S, Q> = S extends GraffyCollection<AnyObject>
  ? Q extends Array<infer QItem>
    ? ResultArray<PlainReadResult<S[string], QItem> & { $key: Key }> // Array $key
    : Q extends { $key: Key }
      ? Q extends { $key: string }
        ? { [key in Q['$key']]: PlainReadResult<S, Q> }
        : ResultArray<PlainReadResult<S[string], Q> & { $key: Key }> //   Single $key
      : { [K in keyof Q]: PlainReadResult<S[string], Q[K]> } //         Object form
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
