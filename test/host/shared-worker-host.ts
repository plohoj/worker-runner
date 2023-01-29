import { DirectionConnectionIdentificationStrategyHost, MessageChannelConnectionStrategyHost, RepeatConnectionStrategyHost, SharedWorkerConnectionHost } from '@worker-runner/core';
import { RunnerResolverHost } from '@worker-runner/promise';
import { RxRunnerResolverHost } from '@worker-runner/rx';
import { PROMISE_CONNECTION_IDENTIFIER_WORKER, RX_CONNECTION_IDENTIFIER_WORKER } from '../common/connection-identifier';
import { runners } from '../common/runner-list';

new RunnerResolverHost({
    runners,
    connection: new SharedWorkerConnectionHost({
        target: self,
        connectionStrategies: [
            new MessageChannelConnectionStrategyHost(),
            new RepeatConnectionStrategyHost(),
        ],
        identificationStrategies: [
            new DirectionConnectionIdentificationStrategyHost({
                clientIdentifier: PROMISE_CONNECTION_IDENTIFIER_WORKER,
                hostIdentifier: PROMISE_CONNECTION_IDENTIFIER_WORKER,
            }),
        ],
    }),
}).run();

new RxRunnerResolverHost({
    runners,
    connection: new SharedWorkerConnectionHost({
        target: self,
        connectionStrategies: [
            new MessageChannelConnectionStrategyHost(),
            new RepeatConnectionStrategyHost(),
        ],
        identificationStrategies: [
            new DirectionConnectionIdentificationStrategyHost({
                clientIdentifier: RX_CONNECTION_IDENTIFIER_WORKER,
                hostIdentifier: RX_CONNECTION_IDENTIFIER_WORKER,
            }),
        ],
    }),
}).run();
