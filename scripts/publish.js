/* eslint-disable no-console */
import { yarn } from './utils.js';

export default async function publish(name, version) {
  const isPre = version.includes('alpha') || version.includes('beta');
  try {
    await yarn(
      name,
      'publish',
      '--access',
      'public',
      '--new-version',
      version,
      ...(isPre ? ['--tag', 'pre'] : []),
      '--non-interactive',
      '--no-git-tag-version',
    );
    console.log(`INFO [${name}] published`);
  } catch (e) {
    console.error(`ERROR [${name}] publishing failed`);
    console.error(e.message);
  }
}
