import { RxHostRunnerResolver } from '@worker-runner/rx';
import { runners } from './common/runner-list';

new RxHostRunnerResolver({runners}).run();
