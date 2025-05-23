export type AnyLeaf = string | number | boolean | null;

// biome-ignore lint/suspicious/noExplicitAny: This is used to match concrete types in "extends" expressions.
export type AnyObject = Record<string, any>;

// biome-ignore lint/suspicious/noExplicitAny: Function for which types are not yet defined.
type AnyFunction = (...args: any[]) => any;

export type GraffyCollection<CollectionSchema extends AnyObject> = {
  __schema: CollectionSchema;
  __brand: 'GraffyCollection';
};
export type GraffyRecord<RecordSchema extends AnyObject> = {
  __schema: RecordSchema;
  __brand: 'GraffyRecord';
};
export type GraffyTree = { __brand: 'GraffyTree' };

// biome-ignore lint/suspicious/noExplicitAny: Keys can be anything.
export type Key = any;
export type RangeKey =
  | { $all: boolean }
  | { $first: number }
  | { $last: number };

// biome-ignore lint/suspicious/noExplicitAny: Any value is for results.
export type AnyValue = any;
