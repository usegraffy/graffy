import { debug } from '@graffy/testing';
global.debug = debug;

process.on('unhandledRejection', reason => {
  // eslint-disable-next-line no-console
  console.error('Unhandled Promise Rejection:', reason);
});
