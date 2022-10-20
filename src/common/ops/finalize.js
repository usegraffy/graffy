import { MAX_KEY, MIN_KEY } from '../util.js';
import { slice, merge, setVersion } from './index.js';
// import { format } from '@graffy/testing';

export default function finalize(graph, query, version = Date.now()) {
  let result = [{ key: MIN_KEY, end: MAX_KEY, version: 0 }];
  // console.log('Finalize Before merge', result);
  merge(result, graph);
  // console.log('Finalize after merge', result);

  if (query) result = slice(result, query).known || [];
  // console.log('Finalize after slice', result);

  result = setVersion(result, version);
  // console.log('Finalizing', result, '\n\n', query, '\n\n', graph);
  return result;
}
