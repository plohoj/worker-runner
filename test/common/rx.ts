import { RxRunnerResolver } from '@modules/rxjs/resolvers/runner.resolver';
import { runners } from './runner-list';

export const rxResolver = new RxRunnerResolver({runners, workerPath: 'base/test/rx-worker.js'});
