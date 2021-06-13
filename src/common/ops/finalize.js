import { slice, merge, setVersion } from './index.js';
// import { format } from '@graffy/testing';

export default function finalize(graph, query, version = Date.now()) {
  let result = [{ key: '', end: '\uffff', version: 0 }];
  if (query) result = slice(result, query).known || [];
  result = setVersion(merge(result, graph), version);
  return result;
}
