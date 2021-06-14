import { merge, slice } from '@graffy/common';
import subscribe from './subscribe.js';
import { format } from '@graffy/testing';
import debug from 'debug';

const log = debug('graffy:fill');

const MAX_RECURSIONS = 10;

export default function fill(_) {
  return (store) => {
    store.on('read', [], async function fillOnRead(query, options, next) {
      let value = await next(query);
      if (options.skipFill) return value;
      if (!value || !value.length) {
        log('No progress', format(query));
        throw Error('fill.no_progress');
        // return null;
      }

      let budget = MAX_RECURSIONS;

      while (budget-- > 1) {
        // console.log('filled value', value);
        const { known, unknown } = slice(value, query);
        value = known;
        if (!unknown) break;
        // console.log('unknown', unknown);
        const res = await store.call('read', unknown, { skipFill: true });
        // console.log('fetched', res);
        merge(value, res);
      }

      if (!budget) {
        log('fill.max_recursion', format(value), format(query));
        throw new Error('fill.max_recursion');
      }
      // console.log('Read', debug(query), 'returned', debug(value));
      return value;
    });

    store.on('watch', [], function fillOnWatch(query, options, next) {
      if (options.skipFill) return next(query);
      return subscribe(store, query, options);
    });
  };
}
