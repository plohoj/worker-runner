import { RunnerResolver } from '@modules/rxjs/runner.resolver';
import { runners } from './runner-list';

export const rxResolver = new RunnerResolver({runners, workerPath: 'base/test/worker.js'});
