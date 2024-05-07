import { Worker } from 'node:worker_threads';
import { root } from './utils.js';

const workerPool = [];

export default function types(name, fileName) {
  return new Promise((resolve, reject) => {
    const worker =
      workerPool.pop() || new Worker(root('scripts', 'tscworker.js'));

    const res = () => {
      worker.off('error', reject);
      worker.off('end', reject);
      resolve();
      workerPool.push(worker);
    };
    worker.once('message', res);
    worker.on('error', reject);
    worker.on('end', reject);

    worker.postMessage({ name, fileName });
  });
}

export function terminateWorkers() {
  return Promise.all(workerPool.map((worker) => worker.terminate()));
}
