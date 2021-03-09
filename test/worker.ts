import { HostRunnerResolver } from '@worker-runner/promise';
import { runners } from './common/runner-list';

new HostRunnerResolver({runners, connections: [self]}).run();
