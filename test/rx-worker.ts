import { RxWorkerRunnerResolver } from '@worker-runner/rx';
import { runners } from './common/runner-list';

new RxWorkerRunnerResolver({runners}).run();
