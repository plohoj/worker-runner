import { RxDevRunnerResolver, RxRunnerResolver } from '@worker-runner/rx';
import { runners } from './runner-list';

export const rxRunnerResolver = new RxRunnerResolver({runners, workerPath: 'base/test/rx-worker.js'});
export const rxDevRunnerResolver = new RxDevRunnerResolver({runners, workerPath: 'base/test/rx-worker.js'});
