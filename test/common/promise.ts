import { DevRunnerResolver } from '@modules/promise/dev/runner.resolver';
import { RunnerResolver } from '@modules/promise/resolvers/runner.resolver';
import { runners } from './runner-list';

export const runnerResolver = new RunnerResolver({runners, workerPath: 'base/test/worker.js'});
export const devRunnerResolver = new DevRunnerResolver({runners});
