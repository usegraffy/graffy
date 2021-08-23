/* eslint-disable no-console */
import { yarn } from './utils.js';

export default async function link(name) {
  try {
    await yarn(name, 'link');
    console.log(`Linked ${name}`);
  } catch (e) {
    console.error(`Error linking ${name}`);
    console.error(e.message);
  }
}
