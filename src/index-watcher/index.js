import Graffy from '@graffy/core';
import { makeStream } from '@graffy/stream';
import {
  encodeKey,
  decodeKey,
  makeQuery,
  merge,
  wrap,
  unwrap,
  makePath,
  decorate,
} from '@graffy/common';

export default function (entityPrefix, entityQuery, getIndexKeys) {
  const prefix = makePath(entityPrefix);
  const children = makeQuery(entityQuery);
  const skipFill = { skipFill: true };

  return (store) => {
    const state = {};
    const root = new Graffy([], store.core);
    let error = null;

    (async function () {
      const version = 0;
      const watchQuery = wrap(
        [{ key: '', end: '\uffff', version, children }],
        prefix,
      );

      // console.log('watching', debug(watchQuery));
      const entityStream = root.call('watch', watchQuery, skipFill);
      try {
        for await (const change of entityStream) {
          // console.log('Entity change received', debug(change));
          if (!change) continue;

          // This is a list of raw changes. We need to do a store.read() for each
          // change to get the changed entities.
          const readQuery = wrap(
            unwrap(change, prefix).map(({ key }) => ({
              key,
              version,
              children,
            })),
            prefix,
          );
          const changedEntities = await root.call('read', readQuery);
          // console.log('Fetched', debug(readQuery), debug(changedEntities));
          unwrap(changedEntities, prefix).forEach(updateEntity);
        }
      } catch (e) {
        /* There was an error. Unwind everything. */
        error = e;
        for (const key in state) {
          for (const end of state[key].endFns) end(e);
          delete state[key];
        }
      }
    })();

    function updateEntity(entity) {
      const entityId = entity.key;
      const path = [...prefix, entityId];
      const porcelainEntity = decorate(entity.children);

      for (const paramKey in state) {
        const { params, entities, pushFns } = state[paramKey];
        const oldKeys = entities[entityId] || new Set();
        const newKeys = new Set(
          getIndexKeys(porcelainEntity, params).map(encodeKey),
        );

        const updates = [];
        const version = entity.version + 1;

        for (const key of oldKeys) {
          if (!newKeys.has(key)) merge(updates, [{ key, end: key, version }]);
        }

        for (const key of newKeys) {
          if (!oldKeys.has(key)) merge(updates, [{ key, version, path }]);
        }

        if (updates.length) {
          const change = [{ key: paramKey, version, children: updates }];
          for (const push of pushFns) {
            // console.log('Index Watcher pushing change', debug(change));
            push(change);
          }

          if (newKeys.size) {
            entities[entityId] = newKeys;
          } else {
            delete entities[entityId];
          }
        }
      }
    }

    function addListener(keys, push, end) {
      for (const key of keys) {
        if (!state[key]) {
          state[key] = {
            params: decodeKey(key),
            entities: {},
            pushFns: new Set(),
            endFns: new Set(),
          };
        }
        state[key].pushFns.add(push);
        state[key].endFns.add(end);
      }
    }

    function removeListener(keys, push, end) {
      for (const key of keys) {
        if (!state[key]) continue;
        state[key].pushFns.delete(push);
        state[key].endFns.delete(end);
        if (!state[key].pushFns.size) delete state[key];
      }
    }

    function putInitial(initial) {
      for (const { key: paramKey, children } of initial) {
        if (!state[paramKey]) throw Error('indexer.unexpected_key', paramKey);
        const { entities } = state[paramKey];
        for (const { key: indexKey, end, path } of children) {
          if (end) continue;
          if (!Array.isArray(path)) {
            throw Error('indexer.link_expected', indexKey);
          }
          const entityId = path[path.length - 1];
          entities[entityId] = entities[entityId] || new Set();
          entities[entityId].add(indexKey);
        }
      }
    }

    store.on('watch', [], (query, _options, _next) => {
      if (error) throw error;
      const keys = query.map(({ key }) => key);

      return makeStream((push, end) => {
        store
          .call('read', query)
          .then((initial) => {
            addListener(keys, push, end);
            putInitial(initial);
            push(initial);
          })
          .catch((e) => end(e));

        return () => {
          removeListener(keys, push, end);
        };
      });
    });
  };
}
