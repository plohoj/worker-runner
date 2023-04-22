import { DirectionInterceptPlugin, MessageChannelConnectionStrategyHost, RepeatConnectionStrategyHost, WorkerConnectionHost } from '@worker-runner/core';
import { RunnerResolverHost } from '@worker-runner/promise';
import { RxRunnerResolverHost } from '@worker-runner/rx';
import { PROMISE_CONNECTION_IDENTIFIER_WORKER, RX_CONNECTION_IDENTIFIER_WORKER } from '../common/connection-identifier';
import { runners } from '../common/runner-list';

new RunnerResolverHost({
    runners,
    connection: new WorkerConnectionHost({
        target: self,
        connectionStrategies: [
            new MessageChannelConnectionStrategyHost(),
            new RepeatConnectionStrategyHost(),
        ],
        plugins: [
            new DirectionInterceptPlugin({
                from: PROMISE_CONNECTION_IDENTIFIER_WORKER,
                to: PROMISE_CONNECTION_IDENTIFIER_WORKER,
            }),
        ],
    }),
}).run();

new RxRunnerResolverHost({
    runners,
    plugins: [
        new DirectionInterceptPlugin({
            from: RX_CONNECTION_IDENTIFIER_WORKER,
            to: RX_CONNECTION_IDENTIFIER_WORKER,
        })
    ],
    connection: new WorkerConnectionHost({
        target: self,
        connectionStrategies: [
            new MessageChannelConnectionStrategyHost(),
            new RepeatConnectionStrategyHost(),
        ],
    }),
}).run();
