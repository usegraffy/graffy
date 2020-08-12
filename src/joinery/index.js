import { getSelects, getUpdates, runSelects } from './sql';

import { Repeater } from '@repeaterjs/repeater';
export default (options) => (store) => {
  store.on('read', read);
  store.on('write', write);

  const pollInterval = options.pollInterval || 1000;

  function read(query) {
    const plans = getSelects(query, options);
    return new Repeater(async (push, stop) => {
      let [result, lastUpdateTime] = await runSelects(plans);
      const interval = setInterval(async () => {
        push(result);
        [result, lastUpdateTime] = await runSelects(plans, lastUpdateTime);
      }, pollInterval);
      await stop;
      clearInterval(interval);
    });
  }

  function write(change) {
    const plans = getUpdates(change, options);
  }
};
