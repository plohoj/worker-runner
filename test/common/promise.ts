import { LocalRunnerResolver, ClientRunnerResolver } from '@worker-runner/promise';
import { runners } from './runner-list';

export const runnerResolver = new ClientRunnerResolver({runners, connection: new Worker('base/test/worker.js')});
export const localRunnerResolver = new LocalRunnerResolver({ runners });
