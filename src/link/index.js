import { wrap, unwrap } from '@graffy/common';
import linkGraph from './linkGraph.js';
import prepQueryLinks from './prepQueryLinks.js';

export default (defs) => (store) => {
  const prefix = store.path;
  const defEntries = Object.entries(defs).map(([prop, def]) => ({
    path: prop.split('.'),
    def,
  }));

  store.on('read', async (query, options, next) => {
    const unwrappedQuery = clone(unwrap(query, prefix));
    const usedDefs = prepQueryLinks(unwrappedQuery, defEntries);

    const result = await next(wrap(unwrappedQuery, prefix), options);
    const unwrappedResult = unwrap(result, prefix);

    // unwrappedResult is still "inside" result and will be modified:
    linkGraph(unwrappedResult, usedDefs);
    return result;
  });
};

function clone(tree) {
  // TODO: Do better
  return JSON.parse(JSON.stringify(tree));
}
