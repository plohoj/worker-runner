import { WorkerRunnerResolver } from '@worker-runner/promise';
import { runners } from './common/runner-list';

new WorkerRunnerResolver({runners, connections: [self]}).run();
