import { RunnerResolver } from '@modules/promise/runner.resolver';
import { runners } from './runner-list';

export const resolver = new RunnerResolver({runners, workerPath: 'base/test/worker.js'});
