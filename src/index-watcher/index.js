// import mergeIterators from 'merge-async-iterators';
import Graffy from '@graffy/core';
import { makeStream } from '@graffy/stream';
import {
  encodeKey,
  decodeKey,
  makeQuery,
  wrap,
  unwrap,
  makePath,
  decorate,
} from '@graffy/common';

export default function(entityPrefix, entityQuery, getIndexKeys) {
  const prefix = makePath(entityPrefix);
  const children = makeQuery(entityQuery);
  const skipFill = { skipFill: true };

  return store => {
    const state = {};
    const root = new Graffy([], store.core);

    (async function() {
      const version = 0;
      const watchQuery = wrap(
        [{ key: '', end: '\uffff', version, children }],
        prefix,
      );

      // console.log('watching', debug(watchQuery));
      const entityStream = root.call('watch', watchQuery, skipFill);
      for await (const change of entityStream) {
        // console.log('Entity change received', debug(change));
        if (!change) continue;

        // This is a list of raw changes. We need to do a store.read() for each
        // change to get the changed entities.
        const readQuery = wrap(
          unwrap(change, prefix).map(({ key }) => ({ key, version, children })),
          prefix,
        );
        const changedEntities = await root.call('read', readQuery);
        // console.log('Fetched', debug(readQuery), debug(changedEntities));
        unwrap(changedEntities, prefix).forEach(updateEntity);
      }
    })();

    /*

    */
    function updateEntity(entity) {
      const entityId = entity.key;
      const path = [...prefix, entityId];
      const porcelainEntity = decorate(entity.children);

      for (const paramKey in state) {
        const { params, entities, listeners } = state[paramKey];
        const oldKeys = entities[entityId] || new Set();
        const newKeys = new Set(
          getIndexKeys(porcelainEntity, params).map(encodeKey),
        );

        const updates = [];
        const version = entity.version + 1;

        for (const key of oldKeys) {
          if (!newKeys.has(key)) updates.push({ key, end: key, version });
        }

        for (const key of newKeys) {
          if (!oldKeys.has(key)) updates.push({ key, version, path });
        }

        if (updates) {
          const change = [{ key: paramKey, version, children: updates }];
          for (const listener of listeners) {
            // console.log('Pushing change', debug(change));
            listener(change);
          }

          if (newKeys.size) {
            entities[entityId] = newKeys;
          } else {
            delete entities[entityId];
          }
        }
      }
    }

    function addListener(keys, listener) {
      for (const key of keys) {
        if (!state[key]) {
          state[key] = {
            params: decodeKey(key),
            entities: {},
            listeners: new Set(),
          };
        }
        state[key].listeners.add(listener);
      }
    }

    function removeListener(keys, listener) {
      for (const key of keys) {
        if (!state[key]) continue;
        state[key].listeners.delete(listener);
        if (!state[key].listeners.size) delete state[key];
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
      const keys = query.map(({ key }) => key);

      // console.log('indexer onWatch', debug(query));

      return makeStream((push, _end) => {
        addListener(keys, push);

        store.call('read', query).then(initial => {
          // console.log('Push initial', debug(initial));
          putInitial(initial);
          push(initial);
        });

        return () => removeListener(keys, push);
      });
    });
  };
}
