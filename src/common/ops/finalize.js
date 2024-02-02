import { MAX_KEY, MIN_KEY } from '../util.js';
import { merge, setVersion, slice } from './index.js';

/**
 *
 * @param {any} graph
 * @param {any} query
 * @param {number | false} version
 * @returns any
 */
export default function finalize(graph, query, version = Date.now()) {
  let result = [{ key: MIN_KEY, end: MAX_KEY, version: 0 }];
  merge(result, graph);
  if (query) result = slice(result, query).known || [];
  if (version !== false) result = setVersion(result, version, true);
  // console.log('Finalizing', result, '\n\n', query, '\n\n', graph);
  return result;
}
