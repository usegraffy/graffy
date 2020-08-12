import { deepMerge } from '@graffy/operations';

export default (callback, interval = 1000) => {
  const query = [];

  function add(q) {
    deepMerge(query, q, (acc, node) => ({ ...acc, sum: acc.sum + node.sum }));
  }

  function del(q) {
    deepMerge(query, q, (acc, node) => ({ ...acc, sum: acc.sum - node.sum }));
  }

  setInterval(() => {}, interval);

  return { add, del };
};
