/* eslint-disable no-console */
const { yarn } = require('./utils');

module.exports = async function link(name) {
  try {
    await yarn(name, 'link');
    console.log(`Linked ${name}`);
  } catch (e) {
    console.error(`Error linking ${name}`);
    console.error(e.message);
  }
};
