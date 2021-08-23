/* eslint-disable no-console */
import { git } from './utils.js';

export default async function tag(version) {
  try {
    await git('tag', version);
    await git('push', 'origin', 'tag', version);
    console.log(`Tagged version ${version}`);
  } catch (e) {
    console.error(`Error tagging ${version}`);
    console.error(e.message);
  }
}
