/* eslint-disable no-console */
const { yarn } = require('./utils');

module.exports = async function publish(name, version) {
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
    console.log(`Published ${name}@${version}`);
  } catch (e) {
    console.error(`Error publishing ${name}@${version}`);
    console.error(e.message);
  }
};
