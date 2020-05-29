import {
  merge,
  slice,
  mergeStreams,
  makeWatcher,
  getKnown,
} from '@graffy/common';
import { mapStream } from '@graffy/stream';
// import { debug } from '@graffy/testing';

const DEFAULT_MAX_AGE = 60000;
const NUM_LAYERS = 3;

export default function ({ maxAge = DEFAULT_MAX_AGE } = {}) {
  return (store) => {
    const layers = [];
    let optimisticState = [];
    const optimisticChanges = new Set();
    const watcher = makeWatcher();

    function addToCache(result) {
      const now = Date.now();
      let state;
      if (!layers.length || now - layers[0][0] > maxAge / NUM_LAYERS) {
        state = [];
        layers.unshift([now, state]);
        layers.splice(NUM_LAYERS);
      } else {
        state = layers[0][1];
      }
      merge(state, result);
    }

    store.on('read', [], async (query, options, next) => {
      if (options.skipCache) return next(query);
      const earliest = Date.now() - maxAge;
      const result = [];
      let miss = false;

      if (optimisticState.length) {
        const { known, unknown } = slice(optimisticState, query);
        if (known) merge(result, known);
        if (!unknown) return result;
        query = unknown;
      }

      for (let i = 0; i < layers.length; i++) {
        const [fetchTime, state] = layers[i];
        if (fetchTime < earliest) break;
        const { known, unknown } = slice(state, query);
        if (known) merge(result, known);
        query = unknown;
        if (!query) break;
        miss = true;
      }

      if (query) {
        miss = true; // Required if 0 layers within maxAge.
        const nextValue = await next(query);
        merge(result, nextValue);
      }

      if (miss) addToCache(result);
      return result;
    });

    store.on('watch', [], (query, options, next) => {
      const nextStream = next(query);
      if (options.skipCache) return nextStream;

      const optiStream = watcher.watch([]);
      const nextStreamCopy = mapStream(nextStream, (change) => {
        addToCache(change);
        return change;
      });

      return mergeStreams(optiStream, nextStreamCopy);
    });

    store.on('write', [], async (change, options, next) => {
      if (!options.optimism) return next(change);

      optimisticChanges.add(change);
      merge(optimisticState, change);
      watcher.write(change);

      try {
        const appliedChange = await next(change);
        addToCache(appliedChange);
        watcher.write(appliedChange);
        return appliedChange;
      } catch (e) {
        const query = getKnown(change);
        const undo = await store.read(query);
        watcher.write(undo);
        throw e;
      } finally {
        optimisticChanges.delete(change);
        optimisticState = [];
        for (const oChange of optimisticChanges) {
          merge(optimisticState, oChange);
        }
      }
    });
  };
}
