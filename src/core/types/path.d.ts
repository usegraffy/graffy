import type {
  AnyObject,
  AnyValue,
  GraffyCollection,
  GraffyRecord,
  GraffyTree,
  Key,
} from './basic';

export type PathOf<S> = RecPathOf<{ node: S; curr: []; path: [] }> | KeyOf<S>;

export type KeyOf<S> = S extends GraffyCollection<AnyObject>
  ? Key
  : S extends GraffyRecord<infer T>
    ? keyof T
    : S extends GraffyTree
      ? Key
      : never;

// To avoid the "too deep" error, unbounded recursive types need to be tail-recursive.
// https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-5.html#tail-recursion-elimination-on-conditional-types

// PathAcc is an accummulator to make PathOf<S> tail recursive
//   - node = current schema node being inspected
//   - path = union of complete paths found so far
//   - curr = path to the current node
type PathAcc = { node: AnyValue; path: Array<Key>; curr: Array<Key> };

export type RecPathOf<Acc extends PathAcc> =
  // If Acc is a union, evaluate subsequent clauses separately for each limb
  Acc extends Acc
    ? Acc['node'] extends GraffyRecord<infer R>
      ? // Similarly, evaluate the following for each branch in a unions of records
        R extends R
        ? RecPathOf<
            {
              // Remove ? marker from keys to avoid ‘| undefined’
              [K in keyof R]-?: {
                node: R[K];
                path: Acc['path'] | Acc['curr'];
                curr: [...Acc['curr'], K];
              };
            }[keyof R]
          >
        : never // impossible for R to not extend R
      : Acc['node'] extends GraffyCollection<infer R>
        ? RecPathOf<{
            node: GraffyRecord<R>;
            path: Acc['path'] | Acc['curr'];
            curr: [...Acc['curr'], Key];
          }>
        : Acc['node'] extends GraffyTree
          ? Acc['path'] | Acc['curr'] | [...Acc['curr'], ...Key[]]
          : Acc['path'] | Acc['curr']
    : never; // impossible for Acc to not extend Acc

type CollVariants<K, N> = ({ $key: K } & N) | [{ $key: K } & N];

// NestAcc is an accummulator to make Nest<> tail recursive
//   - node = current schema node being inspected
//   - path = union of complete paths found so far
//   - curr = path to the current node
type NestAcc = { node: AnyValue; path: Array<Key> };

export type Nest<Node, Path> = Node extends Node
  ? Path extends [...infer P, infer K]
    ? K extends string
      ? Nest<{ [key in K]: Node }, P>
      : K extends Key
        ? Nest<CollVariants<K, Node>, P>
        : never
    : Node
  : never;

type Test = Nest<true, ['foo'] | ['bar'] | ['baz', 'bag']>;

// type Test2 = string[] extends [...infer P, infer K] ? { p: P, k: K } : never;

type Get<S, K> = S extends S
  ? S extends GraffyCollection<infer R>
    ? R
    : S extends GraffyRecord<infer R>
      ? K extends keyof R
        ? R[K]
        : never
      : S extends GraffyTree
        ? GraffyTree
        : never
  : never;

export type Descend<S, P> = P extends []
  ? S
  : P extends [Key]
    ? Get<S, P[0]>
    : P extends [Key, ...infer R]
      ? Descend<Get<S, P[0]>, R>
      : Get<S, P>;
