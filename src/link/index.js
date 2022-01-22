import { wrap, unwrap, finalize, add } from '@graffy/common';
import linkGraph from './linkGraph.js';
import prepQueryLinks from './prepQueryLinks.js';
import debug from 'debug';

const log = debug('graffy:link');

export default (defs) => (store) => {
  const prefix = store.path;
  const defEntries = Object.entries(defs).map(([prop, def]) => ({
    path: prop.split('.'),
    def,
  }));

  store.on('read', async (query, options, next) => {
    const unwrappedQuery = clone(unwrap(query, prefix));
    const usedDefs = prepQueryLinks(unwrappedQuery, defEntries);

    // Shortcut for queries that don't interact with any links
    if (!usedDefs.length) return next(query, options);

    const result = await next(wrap(unwrappedQuery, prefix), options);
    const version = result[0].version;
    const unwrappedResult = unwrap(result, prefix);

    // PrepQueryLinks have removed the parts of the query that are
    // provided by links, so the result would not have "finalized"
    // them.
    add(unwrappedQuery, unwrap(query, prefix));

    log('finalizing', prefix, unwrappedQuery);
    const finalizedResult = finalize(unwrappedResult, unwrappedQuery, version);

    log('beforeAddingLinks', prefix, finalizedResult);
    linkGraph(finalizedResult, usedDefs);
    log('afterAddingLinks', prefix, finalizedResult);
    return wrap(finalizedResult, prefix, version);
  });
};

function clone(tree) {
  // TODO: Do better
  return JSON.parse(JSON.stringify(tree));
}
