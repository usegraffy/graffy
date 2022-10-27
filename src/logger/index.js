/* eslint-disable no-console */



export default function () {
  return (store) => {
    store.on('read', (query, options, next) => {
      console.log('Read', query, options);
      return next(query);
    });
    store.on('write', (change, options, next) => {
      console.log('Write', change, options);
      return next(change);
    });
    store.on('watch', (query, options, next) => {
      console.log('Watch', query, options);
      return next(query);
    });
  };
}
