/**
 * This file is for testing typescript checks in an editor.
 */

import { key } from '@graffy/testing';
import type Graffy from '../types';
import type {
  AnyObject,
  Descend,
  Get,
  GraffyCollection,
  Key,
  PathOf,
  PlainReadResult,
  Project,
  ReadResult,
} from '../types';

interface Person {
  id: string & { __brand: 'SomePerson' };
  name: string;
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  config: Record<string, any> | null;
}

type TestSchema = {
  Activity: GraffyCollection<Person>;
  Person: GraffyCollection<Person>;
};

const store: Graffy<TestSchema> = {} as Graffy<TestSchema>;

const t = 'Activity';
const q = { name: true, id: true, config: true, $key: 'arst' };
const res0 = await store.read(t, q);
const res1 = await store.read(['Activity', '123'], q);
const res2 = await store.read({
  Activity: [{ $key: 10, name: true, config: true }],
});
const res3 = await store.read({
  Activity: {
    arst: {
      name: true,
      config: { foo: { bar: true, baz: true } },
    },
  },
});
const res4 = await store.read('Activity', {
  $key: 'arst',
  name: true,
  config: { foo: true },
});

const res5 = await store.read({
  Activity: { $key: 'arst', name: true, config: { foo: true } },
});

type Q = { $key: 'arst'; name: true; config: { foo: true } };

type B = Q extends {
  $key: string;
}
  ? { [K in Q['$key']]: true }
  : false;

type G = TestSchema['Activity'][string];

type P = Project<{ conf: Record<string, any> | null }>;

type T = ReadResult<
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  { Activity: GraffyCollection<any> },
  { Activity: { $key: 'arst'; id: true } }
>;

// type TestDescend1 = Descend<TestSchema, 'Activity'>;
// const x: Project<TestDescend1> = { $key: '123', name: true };

// type TestDescend2 = Descend<TestSchema, ['Activity', 'arst']>;

// type Foo1 = ['Activity', 'arst'] extends [Key, ...infer R] ? R : false;
// type Foo2 = ['Activity', 'arst'] extends [Key] ? true : false;

// type Foo3 = Get<Get<TestSchema, 'Activity'>, 'arst'>;

// type Foo4 = Project<Descend<TestSchema, 'Activity'>>;

// type Foo5 = { [k in keyof boolean]: k };

// type Foo6 = boolean extends AnyObject ? true : false;

// type Foo7 = string extends Project<TestDescend1> ? true : false;

// type T = { $key: 'arst'; foo: 1 };

// type Y = T extends { $key: Key } & infer U ? U : never;

type Z = 'string' extends keyof Record<string, any> ? true : false;
