import mergeStreams from './mergeStreams';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const stream1 = (async function*() {
  await sleep(5);
  yield 'a';
  await sleep(10);
  yield 'b';
  await sleep(10);
})();

const stream2 = (async function*() {
  yield 'c';
  await sleep(10);
  return 'd';
})();

test('run-to-end', async function() {
  let i = 0;
  let result = ['c', 'a', 'd', 'b'];
  for await (const value of mergeStreams([stream1, stream2])) {
    expect(value).toBe(result[i++]);
  }
});

// test('run-break');
