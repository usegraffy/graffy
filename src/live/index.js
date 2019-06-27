import subscribe from './subscribe';

export default function live(store) {
  if (!store) return live; // This is for people who .use(live())

  store.on('sub', [], function(query, options, next) {
    if (options.skipLive) return next(query);
    return subscribe(store, query, options.raw);
  });
}
