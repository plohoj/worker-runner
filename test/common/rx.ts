import { RxLocalRunnerResolver, RxNodeRunnerResolver } from '@worker-runner/rx';
import { runners } from './runner-list';

export const rxRunnerResolver = new RxNodeRunnerResolver({runners, workerPath: 'base/test/rx-worker.js'});
export const rxLocalRunnerResolver = new RxLocalRunnerResolver({runners, workerPath: 'base/test/rx-worker.js'});
