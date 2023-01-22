import { DirectionConnectionIdentificationStrategyHost, MessageChannelConnectionStrategyHost, RepeatConnectionStrategyHost, WindowMessageEventConnectionHost } from '@worker-runner/core';
import { RunnerResolverHost } from '@worker-runner/promise';
import { RxRunnerResolverHost } from '@worker-runner/rx';
import { PROMISE_CONNECTION_IDENTIFIER_IFRAME_CLIENT, PROMISE_CONNECTION_IDENTIFIER_IFRAME_HOST, RX_CONNECTION_IDENTIFIER_IFRAME_CLIENT, RX_CONNECTION_IDENTIFIER_IFRAME_HOST } from '../common/connection-identifier';
import { runners } from '../common/runner-list';

new RunnerResolverHost({
    runners,
    connection: new WindowMessageEventConnectionHost({
        eventListenerTarget: window,
        postMessageTarget: window,
        connectionStrategies: [
            new MessageChannelConnectionStrategyHost(),
            new RepeatConnectionStrategyHost(),
        ],
        identificationStrategies: [
            new DirectionConnectionIdentificationStrategyHost({
                clientIdentifier: PROMISE_CONNECTION_IDENTIFIER_IFRAME_CLIENT,
                hostIdentifier: PROMISE_CONNECTION_IDENTIFIER_IFRAME_HOST,
            }),
        ],
    }),
}).run();

new RxRunnerResolverHost({
    runners,
    connection: new WindowMessageEventConnectionHost({
        eventListenerTarget: window,
        postMessageTarget: window,
        connectionStrategies: [
            new MessageChannelConnectionStrategyHost(),
            new RepeatConnectionStrategyHost(),
        ],
        identificationStrategies: [
            new DirectionConnectionIdentificationStrategyHost({
                clientIdentifier: RX_CONNECTION_IDENTIFIER_IFRAME_CLIENT,
                hostIdentifier: RX_CONNECTION_IDENTIFIER_IFRAME_HOST,
            }),
        ],
    }),
}).run();
