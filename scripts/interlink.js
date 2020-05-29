/* eslint-disable no-console */
const { yarn, dst, ownPattern } = require('./utils');

module.exports = async function link(name) {
  try {
    await Promise.all(
      Object.keys(require(dst(name, 'package.json')).dependencies)
        .filter((dep) => ownPattern.test(dep))
        .map((dep) => yarn(name, 'link', dep)),
    );
    console.log(`Interlinked: ${name}`);
  } catch (e) {
    console.error(`Error interlinking: ${name}`);
    console.error(e.message);
  }
};
