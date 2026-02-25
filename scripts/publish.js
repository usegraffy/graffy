import { npm } from './utils.js';

export default async function publish(name, version, provenance = false) {
  const isPre = version.includes('alpha') || version.includes('beta');
  try {
    await npm(
      name,
      'publish',
      '--access',
      'public',
      ...(isPre ? ['--tag', 'pre'] : []),
      ...(provenance ? ['--provenance'] : []),
    );
    console.log(`INFO [${name}] published`);
  } catch (e) {
    console.error(`ERROR [${name}] publishing failed`);
    console.error(e.message);
  }
}
