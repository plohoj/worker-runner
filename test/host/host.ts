import { RunnerResolverHost } from '@worker-runner/promise';
import { runners } from '../common/runner-list';

new RunnerResolverHost({runners, connections: [self]}).run();
