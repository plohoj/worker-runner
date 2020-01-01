import { RxDevRunnerResolver } from '@worker-runner/rx/dev/runner.resolver';
import { RxRunnerResolver } from '@worker-runner/rx/resolvers/runner.resolver';
import { runners } from './runner-list';

export const rxRunnerResolver = new RxRunnerResolver({runners, workerPath: 'base/test/rx-worker.js'});
export const rxDevRunnerResolver = new RxDevRunnerResolver({runners, workerPath: 'base/test/rx-worker.js'});
