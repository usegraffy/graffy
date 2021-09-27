/* eslint-disable no-console */
import { root } from './utils.js';
import { Worker } from 'worker_threads';

export default function types(name, watch) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(root('scripts', 'tsworker.js'), {
      workerData: { name, watch },
    });
    worker.on('message', resolve);
    worker.on('error', reject);
  });
}
