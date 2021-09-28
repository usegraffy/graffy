/* eslint-disable no-console */
import { root } from './utils.js';
import { Worker } from 'worker_threads';

const workerPool = [];

export default function types(name, fileName) {
  return new Promise((resolve, reject) => {
    const worker =
      workerPool.pop() || new Worker(root('scripts', 'tscworker.js'));

    const res = () => {
      resolve();
      workerPool.push(worker);
    };
    worker.once('message', res);
    worker.on('error', reject);
    worker.on('end', reject);

    worker.postMessage({ name, fileName });
  });
}
