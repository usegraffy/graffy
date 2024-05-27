import { npm } from './utils.js';

export default async function link(name) {
  try {
    await npm(name, 'link');
    console.log(`INFO [${name}] linked`);
  } catch (e) {
    console.error(`ERROR [${name}] link failed`);
    console.error(e.message);
  }
}
