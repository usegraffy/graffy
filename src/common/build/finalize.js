import { slice, merge, setVersion } from '../graph';

export default function finalize(graph, query, version = Date.now()) {
  const empty = [{ key: '', end: '\uffff', version: 0 }];
  return slice(setVersion(merge(empty, graph), version), query).known;
}
