/* eslint-disable no-console */
const { git } = require('./utils');

module.exports = async function tag(version) {
  try {
    await git('tag', version);
    await git('push', 'origin', 'tag', version);
    console.log(`Tagged version ${version}`);
  } catch (e) {
    console.error(`Error tagging ${version}`);
    console.error(e.message);
  }
};
