import { LocalRunnerResolver, NodeRunnerResolver } from '@worker-runner/promise';
import { runners } from './runner-list';

export const runnerResolver = new NodeRunnerResolver({runners, connection: new Worker('base/test/worker.js')});
export const localRunnerResolver = new LocalRunnerResolver({ runners });
