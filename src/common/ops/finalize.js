import { MAX_KEY, MIN_KEY } from '../util.js';
import { slice, merge, setVersion } from './index.js';

export default function finalize(
  graph,
  query,
  version = Date.now(),
  suppressSetVersion = false,
) {
  let result = [{ key: MIN_KEY, end: MAX_KEY, version: 0 }];
  merge(result, graph);
  if (query) result = slice(result, query).known || [];
  if (!suppressSetVersion) result = setVersion(result, version);
  // console.log('Finalizing', result, '\n\n', query, '\n\n', graph);
  return result;
}
