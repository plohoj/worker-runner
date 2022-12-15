import { MessageChannelConnectionStrategyHost, RepeatConnectionStrategyHost, WorkerConnectionHost } from '@worker-runner/core';
import { RunnerResolverHost } from '@worker-runner/promise';
import { runners } from '../common/runner-list';

new RunnerResolverHost({
    runners,
    connection: new WorkerConnectionHost({
        target: self,
        strategies: [
            new MessageChannelConnectionStrategyHost(),
            new RepeatConnectionStrategyHost(),
        ]
    }),
}).run();
