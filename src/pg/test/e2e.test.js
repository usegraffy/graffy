import { execFile as execFileCb } from 'child_process';
import { promisify } from 'util';
import { Client } from 'pg';
import { connOptions, populate } from './setup.js';

const execFile = promisify(execFileCb);
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const isPgReady = async () => {
  try {
    const client = new Client(connOptions);
    await client.connect();
    await client.end();
    return true;
  } catch (_) {
    return false;
  }
};

jest.setTimeout(30000);

describe('pg-e2e', () => {
  beforeAll(async () => {
    // const start = Date.now();
    // prettier-ignore
    try {
      await execFile('docker', [
        'run', '-d',
        '--name', 'graffypg',
        '-p', `${connOptions.port}:5432`,
        '-e', `POSTGRES_PASSWORD=${connOptions.password}`,
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
        'Docker might have printed a detailed error message above.',
      );

      throw e;
    }

    while (!(await isPgReady(connOptions.port))) await sleep(200);
    // console.log('Postgres is up in', Date.now() - start, 'ms');
  });

  afterAll(async () => {
    await execFile('docker', ['rm', '-f', 'graffypg']);
  });

  beforeEach(() => populate());

  test('example', () => {
    /* This is an example to be replaced with real tests. */
  });
});
