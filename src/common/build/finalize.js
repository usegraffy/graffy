import { slice, merge, setVersion } from '../graph';

export default function finalize(graph, query, version = Date.now()) {
  const empty = [{ key: '', end: '\uffff', version: 0 }];
  const res = slice(setVersion(merge(empty, graph), version), query, {
    addLinked: () => {
      /*
        This is quite a hacky way to prevent slice from trying to expand
        links.
      */
    },
  }).known;
  return res;
}
