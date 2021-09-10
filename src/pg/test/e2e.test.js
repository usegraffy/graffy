import { execFile as execFileCb } from 'child_process';
import { promisify } from 'util';
import { connOptions, populate } from './setup.js';

const execFile = promisify(execFileCb);
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

describe('pg-e2e', () => {
  beforeAll(async () => {
    try {
      await execFile('docker', [
        'run',
        '--name',
        'graffypg',
        '-p',
        `${connOptions.port}:5432`,
        '-e',
        `POSTGRES_PASSWORD=${connOptions.password}`,
        '-d',
        'postgres:alpine',
      ]);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(
        'Could not start a test Postgres server using Docker.\n' +
          'Possible reasons:\n' +
          '1. You might not have Docker installed.\n' +
          '2. The last test run might not have exited properly.\n' +
          '   Run yarn pg:cleanup to fix this.\n' +
          'Detailed error message below.',
      );

      throw e;
    }

    await sleep(2000);
  });

  afterAll(async () => {
    // await execFile('docker', ['rm', '-f', 'graffypg']);
  });

  beforeEach(() => populate());

  test('foo', () => {
    console.log('It works. Or not.');
  });
});
