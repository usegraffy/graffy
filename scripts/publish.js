/* eslint-disable no-console */
const { yarn } = require('./utils');

module.exports = async function publish(name, version) {
  try {
    await yarn(
      name,
      'publish',
      '--access',
      'public',
      '--new-version',
      version,
      '--non-interactive',
      '--no-git-tag-version',
    );
    console.log(`Published ${name}@${version}`);
  } catch (e) {
    console.error(`Error publishing ${name}@${version}`);
    console.error(e.message);
  }
};
