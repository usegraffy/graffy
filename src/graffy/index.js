import Graffy from '@graffy/core';
import Fill from '@graffy/fill';
import Cache from '@graffy/cache';
export { link, page, encodeKey as key, decodeKey } from '@graffy/common';

export default function(options) {
  const store = new Graffy();
  store.use(Fill(options));
  store.use(Cache(options));
  return store;
}
