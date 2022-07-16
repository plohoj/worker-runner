import { RunnerResolverHost } from '@worker-runner/promise';
import { MessageChannelConnectionStrategyHost } from 'packages/core/connection-strategies/message-channel/message-channel.connection-strategy-host';
import { WorkerConnectionHost } from 'packages/core/connections/worker/worker.connection-host';
import { runners } from '../common/runner-list';

new RunnerResolverHost({
    runners,
    connection: new WorkerConnectionHost({
        target: self,
        strategies: [
            new MessageChannelConnectionStrategyHost(),
        ]
    }),
}).run();
