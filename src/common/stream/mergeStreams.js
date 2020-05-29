import mergeIterators from 'merge-async-iterators';
import { merge } from '../graph';

export default async function* mergeStreams(...streams) {
  const firstValues = (
    await Promise.all(streams.map((stream) => stream.next()))
  ).map((iter) => iter.value);

  // If even one is a change-only stream, the result is a change-only stream
  if (firstValues.some((value) => typeof value === 'undefined')) {
    yield undefined;
    for (const value of firstValues) {
      if (typeof value !== 'undefined') yield value;
    }
  } else {
    let merged = [];
    for (const value of firstValues) merge(merged, value);
    yield merged;
  }

  yield* mergeIterators(streams);
}
