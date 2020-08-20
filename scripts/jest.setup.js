import { format } from '@graffy/testing';
global.format = format;

process.on('unhandledRejection', (reason) => {
  // eslint-disable-next-line no-console
  console.error('Unhandled Promise Rejection:', reason);
});
