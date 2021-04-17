import { slice, merge, setVersion } from '../../ops';
import { format } from '@graffy/testing';

export default function finalize(graph, query, version = Date.now()) {
  const empty = [{ key: '', end: '\uffff', version: 0 }];
  const queryShapedEmpty = slice(empty, query).known;
  // console.log(format(queryShapedEmpty));
  const res = slice(setVersion(merge(queryShapedEmpty, graph), version), query)
    .known;

  // console.log(format(res));

  return res;

  // const res = slice(setVersion(merge(empty, graph), version), query, {
  //   addLinked: () => {
  //     /*
  //       This is quite a hacky way to prevent slice from trying to expand
  //       links.
  //     */
  //   },
  // }).known;
  // return res;
}
