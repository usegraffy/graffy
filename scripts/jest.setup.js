import util from 'util';

process.on('unhandledRejection', (reason) => {
  // eslint-disable-next-line no-console
  console.error('Unhandled Promise Rejection:', reason);
});

util.inspect.defaultOptions.showHidden = true;
util.inspect.defaultOptions.depth = 20;
util.inspect.defaultOptions.colors = true;
util.inspect.defaultOptions.maxStringLength = 10000;
util.inspect.defaultOptions.compact = true;
