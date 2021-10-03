import { RxRunnerResolverHost } from '@worker-runner/rx';
import { runners } from '../common/runner-list';

new RxRunnerResolverHost({runners}).run();
