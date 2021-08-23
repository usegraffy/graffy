/* eslint-disable no-console */
import { yarn, ownPattern, read } from './utils.js';

export default async function link(name) {
  try {
    await Promise.all(
      Object.keys(read('dst', name, 'package.json').dependencies)
        .filter((dep) => ownPattern.test(dep))
        .map((dep) => yarn(name, 'link', dep)),
    );
    console.log(`Interlinked: ${name}`);
  } catch (e) {
    console.error(`Error interlinking: ${name}`);
    console.error(e.message);
  }
}
