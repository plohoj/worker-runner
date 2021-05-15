import { RxLocalRunnerResolver, RxClientRunnerResolver } from '@worker-runner/rx';
import { runners } from '../common/runner-list';
import { clientRunner } from './client-runner-list';

export const rxRunnerResolver = new RxClientRunnerResolver({runners: clientRunner, connection: new Worker('base/test/host/rx-worker.js')});
export const rxLocalRunnerResolver = new RxLocalRunnerResolver({ runners });
