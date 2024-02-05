import Cache from '@graffy/cache';
import Graffy from '@graffy/core';
import Fill from '@graffy/fill';

export default function (options) {
  const store = new Graffy();
  store.use(Fill(options));
  store.use(Cache(options));
  return store;
}
