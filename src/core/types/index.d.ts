export type JsonObject = Record<string, unknown>;

type Key = unknown;

// biome-ignore lint/suspicious/noExplicitAny: "Unknown" prevents assigning a concrete type to this parameter.
export type GraffyCollection<CollectionSchema extends Record<string, any>> = {
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

  // biome-ignore lint/suspicious/noExplicitAny: TODO: add typings
  on: (...any) => any;
  // biome-ignore lint/suspicious/noExplicitAny: TODO: add typings
  call: (...any) => any;
  // biome-ignore lint/suspicious/noExplicitAny: TODO: add typings
  use: (...any) => any;
  // biome-ignore lint/suspicious/noExplicitAny: TODO: add typings
  onRead: (...any) => any;
  // biome-ignore lint/suspicious/noExplicitAny: TODO: add typings
  onWrite: (...any) => any;
  // biome-ignore lint/suspicious/noExplicitAny: TODO: add typings
  onWatch: (...any) => any;
  // biome-ignore lint/suspicious/noExplicitAny: TODO: add typings
  write: (...any) => any;
  // biome-ignore lint/suspicious/noExplicitAny: TODO: add typings
  watch: (...any) => any;
}

export type PathOf<S> = S extends GraffyCollection<BuildObject>
  ? string | Key
  : S extends JsonObject
    ? keyof S | [keyof S, ...PathOf<S[keyof S]>[]]
    : never;

export type Descend<S, P> = S extends GraffyCollection<BuildObject>
  ? S[string]
  : P extends keyof S
    ? S[P]
    : P extends [keyof S]
      ? S[P[0]]
      : P extends [keyof S, ...infer R]
        ? Descend<S[P[0]], R>
        : S;

export type Project<S> = S extends GraffyCollection<BuildObject>
  ?
      | (Project<S[string]> & { $key: Key })
      | (Project<S[string]> & { $key: Key })[]
  : S extends JsonObject
    ? Partial<{ [K in keyof S]: Project<S[K]> }>
    : boolean;

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
type ResultArray<R> = R[] & { $page: any; $next: any; $prev: any };

type ReadResult<S, Q> = S extends GraffyCollection<BuildObject>
  ? (S[string] & { $key: Key }) | ResultArray<S[string] & { $key: Key }>
  : S extends JsonObject
    ? { [K in keyof S & keyof Q]: ReadResult<S[K], Q[K]> }
    : S;

type GraffyReadOptions = JsonObject;
