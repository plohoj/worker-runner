import { LocalRunnerResolver, ClientRunnerResolver } from '@worker-runner/promise';
import { runners } from '../common/runner-list';
import { clientRunner } from './client-runner-list';

export const runnerResolver = new ClientRunnerResolver({runners: clientRunner, connection: new Worker('base/test/host/worker.js')});
export const localRunnerResolver = new LocalRunnerResolver({ runners });
