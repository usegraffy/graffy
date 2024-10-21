/**
 * This file is for testing typescript checks in an editor.
 */

import type Graffy from '../types';
import type {
  AnyObject,
  Descend,
  Get,
  GraffyCollection,
  Key,
  PathOf,
  Project,
  ReadResult,
} from '../types';

interface Person {
  id: string;
  name: string;
}

type TestSchema = {
  Activity: GraffyCollection<Person>;
  Person: GraffyCollection<Person>;
};

const testStore: Graffy<TestSchema> = {} as Graffy<TestSchema>;

// biome-ignore lint/correctness/noConstantCondition: Swallow TS error.
if (false) {
  // The first store.read always throws an error that the type is too complex.
  // We want to ignore that on a fake call that will never be executed.
  // @ts-expect-error
  testStore.read([], {});
}

const t = 'Activity' as const;

const q = { name: true, id: true, $key: true };

await testStore.read('Activity', q);

const res = await testStore.read(['Activity', '123'], q);

res.id;

testStore.read({ Activity: [{ $key: 10, name: true }] });

type TestDescend1 = Descend<TestSchema, 'Activity'>;
const x: Project<TestDescend1> = { $key: '123', name: true };

type TestDescend2 = Descend<TestSchema, ['Activity', 'arst']>;

type Foo1 = ['Activity', 'arst'] extends [Key, ...infer R] ? R : false;
type Foo2 = ['Activity', 'arst'] extends [Key] ? true : false;

type Foo3 = Get<Get<TestSchema, 'Activity'>, 'arst'>;

type Foo4 = Project<Descend<TestSchema, 'Activity'>>;

type Foo5 = { [k in keyof boolean]: k };

type Foo6 = boolean extends AnyObject ? true : false;

type Foo7 = string extends Project<TestDescend1> ? true : false;
