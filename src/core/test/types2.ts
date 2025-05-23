export type AnyObject = Record<string, any>;
export type Key = any;

export type GraffyCollection<CollectionSchema extends AnyObject> = {
  [name: string]: CollectionSchema;
} & { __brand: 'GraffyCollection' };

interface Person {
  id: string & { __brand: 'SomePerson' };
  name?: string;
  config?: AnyObject | null;
}

interface Activity {
  id: string & { __brand: 'SomeActivity' };
  subject?: string;
  content?: AnyObject | null;
}

type TestSchema = {
  Activity: Activity;
  Person: Person;
};

export type S =
  TestSchema[keyof TestSchema][keyof TestSchema[keyof TestSchema]];

export type U = {
  [K in keyof TestSchema]: { [M in keyof TestSchema[K]]: TestSchema[K][M] };
};

// export type PathOf<S> = PathOfAcc<S, []> | keyof S;

// type PathOfAcc<
//   S,
//   Acc extends Array<Key>,
// > = S extends GraffyCollection<AnyObject>
//   ? [...Acc, Key?]
//   : S extends AnyObject
//     ? PathOfAcc<S[keyof S], [...Acc, (keyof S)?]>
//     : Acc;

export type T1 = PathOf<TestSchema>;

export type PathOf2<S> = S extends GraffyCollection<AnyObject>
  ? Key
  : S extends AnyObject
    ? [keyof S, ...PathOf2<S[keyof S]>]
    : never;

export type T2 = PathOf2<TestSchema>;
