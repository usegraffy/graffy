export default function getToken() {
  const token = {};
  let listeners = [];
  let signaled = false;

  function onSignal(fn) {
    if (signaled) return fn();
    listeners.push(fn);
  }

  function signal() {
    signaled = true;
    listeners.forEach(fn => {
      try {
        fn();
      } catch (e) {
        /* Do nothing */
      }
    });
    listeners = null;
  }

  Object.defineProperty(token, 'signaled', {
    get: () => signaled,
    enumerable: true,
  });
  Object.defineProperty(token, 'onSignal', {
    value: onSignal,
    enumerable: true,
  });
  return [token, signal];
}
