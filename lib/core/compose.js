// This is based on koa-compose.

function compose() {
  const middleware = [];

  function exec(context, next) {
    // last called middleware #
    let index = -1;
    function dispatch (i) {
      if (i <= index) return Promise.reject(new Error('next() called multiple times'));
      index = i;
      let fn = middleware[i];
      if (i === middleware.length) fn = next;
      if (!fn) return Promise.resolve();
      try {
        return fn(context, dispatch.bind(null, i + 1));
      } catch (err) {
        return Promise.reject(err);
      }
    }
    return dispatch(0);
  }

  exec.push = middleware.push.bind(middleware);
  return exec;
}

export default compose;
