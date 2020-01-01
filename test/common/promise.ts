import { DevRunnerResolver, RunnerResolver } from '@worker-runner/promise';
import { runners } from './runner-list';

export const runnerResolver = new RunnerResolver({runners, workerPath: 'base/test/worker.js'});
export const devRunnerResolver = new DevRunnerResolver({runners});
