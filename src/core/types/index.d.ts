// biome-ignore lint/suspicious/noExplicitAny: This is used to match concrete types in "extends" expressions.
export type AnyObject = Record<string, any>;

// biome-ignore lint/suspicious/noExplicitAny: Function for which types are not yet defined.
type AnyFunction = (...args: any[]) => any;

// biome-ignore lint/suspicious/noExplicitAny: Keys can be anything.
type Key = any;

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

  on: AnyFunction;
  call: AnyFunction;
  use: AnyFunction;
  onRead: AnyFunction;
  onWrite: AnyFunction;
  onWatch: AnyFunction;
  write: AnyFunction;
  watch: AnyFunction;
}

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

export type Project<S> = S extends GraffyCollection<AnyObject>
  ?
      | (Project<S[string]> & { $key: Key })
      | (Project<S[string]> & { $key: Key })[]
  : S extends AnyObject
    ? Partial<{ [K in keyof S]: Project<S[K]> }>
    : boolean;

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
type ResultArray<R> = R[] & { $page: any; $next: any; $prev: any };

type ReadResult<S, Q> = S extends GraffyCollection<AnyObject>
  ? (S[string] & { $key: Key }) | ResultArray<S[string] & { $key: Key }>
  : S extends AnyObject
    ? { [K in keyof S & keyof Q]: ReadResult<S[K], Q[K]> }
    : S;

type GraffyReadOptions = AnyObject;
