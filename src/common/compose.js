// This is based on koa-compose.

function compose() {
  const middleware = [];

  function exec(startPayload, startOptions, next) {
    // last called middleware #
    let index = -1;
    function dispatch(i, payload, options) {
      if (i <= index) return Promise.reject(new Error('compose.multiple_next'));
      if (!payload || !options) {
        return Promise.reject(new Error('compose.missing_arg'));
      }
      index = i;
      let fn = middleware[i];
      if (i === middleware.length) fn = next;
      if (!fn) return Promise.resolve();
      try {
        const r = fn(
          payload,
          options,
          (nextPayload = payload, nextOptions = options) =>
            dispatch(i + 1, nextPayload, nextOptions),
        );
        return r;
      } catch (err) {
        return Promise.reject(err);
      }
    }
    return dispatch(0, startPayload, startOptions);
  }

  exec.push = middleware.push.bind(middleware);
  return exec;
}

export default compose;
