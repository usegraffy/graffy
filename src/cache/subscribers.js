/*
  Manages a set of subscribers.

  listen(query): Adds a query to the subscriber list. Returns an async iterable. If the returned iterable .returns or .throws, the query is removed.

  notify(data):
*/

module.exports = function() {
  const listeners = {};
  let lastId = 0;

  return {
    listen(query, data) {
      const id = lastId++;
      const [push, stream] = makeStream(function() {
        delete listeners[id];
      });
      listeners[id] = { query, data, push };
      return stream;
    },

    notify(data) {},
  };
};
