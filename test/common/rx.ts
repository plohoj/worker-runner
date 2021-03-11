import { RxLocalRunnerResolver, RxClientRunnerResolver } from '@worker-runner/rx';
import { runners } from './runner-list';

export const rxRunnerResolver = new RxClientRunnerResolver({runners, connection: new Worker('base/test/rx-worker.js')});
export const rxLocalRunnerResolver = new RxLocalRunnerResolver({ runners });
