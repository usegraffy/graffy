/* eslint-disable no-console */

import { format } from '@graffy/testing';

export default function () {
  return (store) => {
    store.on('read', (query, options, next) => {
      console.log('Read', format(query), options);
      return next(query);
    });
    store.on('write', (change, options, next) => {
      console.log('Write', format(change), options);
      return next(change);
    });
    store.on('watch', (query, options, next) => {
      console.log('Watch', format(query), options);
      return next(query);
    });
  };
}
