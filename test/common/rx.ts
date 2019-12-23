import { RxDevRunnerResolver } from '@modules/rx/dev/runner.resolver';
import { RxRunnerResolver } from '@modules/rx/resolvers/runner.resolver';
import { runners } from './runner-list';

export const rxResolver = new RxRunnerResolver({runners, workerPath: 'base/test/rx-worker.js'});
export const rxDevResolver = new RxDevRunnerResolver({runners, workerPath: 'base/test/rx-worker.js'});
