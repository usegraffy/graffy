function getSomeObject() {
  return { foo: 12 };
}

const timings = {
  baseline: 0,
  freeze: 0,
  define: 0,
  redefine: 0,
  create: 0,
  update: 0,
};

let start;

for (let round = 0; round < 10; round++) {
  gc();
  start = performance.now();
  for (let i = 0; i < 1000000; i++) {
    const object = getSomeObject();
  }
  if (round > 3) timings.baseline += performance.now() - start;

  gc();
  start = performance.now();
  for (let i = 0; i < 1000000; i++) {
    const object = getSomeObject();
    Object.freeze(object);
  }
  if (round > 3) timings.freeze += performance.now() - start;

  gc();
  start = performance.now();
  for (let i = 0; i < 1000000; i++) {
    const object = getSomeObject();
    Object.defineProperty(object, 'bar', { value: 24 });
  }
  if (round > 3) timings.define += performance.now() - start;

  gc();
  start = performance.now();
  for (let i = 0; i < 1000000; i++) {
    const object = getSomeObject();
    Object.defineProperty(object, 'foo', { value: 24 });
  }
  if (round > 3) timings.redefine += performance.now() - start;

  gc();
  start = performance.now();
  for (let i = 0; i < 1000000; i++) {
    const object = getSomeObject();
    object.bar = 24;
  }
  if (round > 3) timings.create += performance.now() - start;

  gc();
  start = performance.now();
  for (let i = 0; i < 1000000; i++) {
    const object = getSomeObject();
    object.foo = 24;
  }
  if (round > 3) timings.update += performance.now() - start;
}

console.log(timings);
