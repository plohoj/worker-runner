import { WorkerRunnerResolver } from '@worker-runner/promise';
import { runners } from './common/runner-list';

new WorkerRunnerResolver({runners}).run();
