import { MessageChannelConnectionStrategyHost, WorkerConnectionHost } from '@worker-runner/core';
import { RxRunnerResolverHost } from '@worker-runner/rx';
import { runners } from '../common/runner-list';

new RxRunnerResolverHost({
    runners,
    connection: new WorkerConnectionHost({
        target: self,
        strategies: [
            new MessageChannelConnectionStrategyHost(),
        ]
    }),
}).run();
