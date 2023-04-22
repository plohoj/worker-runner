import { DirectionInterceptPlugin, IframeConnectionHost, MessageChannelConnectionStrategyHost, RepeatConnectionStrategyHost } from '@worker-runner/core';
import { RunnerResolverHost } from '@worker-runner/promise';
import { RxRunnerResolverHost } from '@worker-runner/rx';
import { PROMISE_CONNECTION_IDENTIFIER_IFRAME_CLIENT, PROMISE_CONNECTION_IDENTIFIER_IFRAME_HOST, RX_CONNECTION_IDENTIFIER_IFRAME_CLIENT, RX_CONNECTION_IDENTIFIER_IFRAME_HOST } from '../common/connection-identifier';
import { runners } from '../common/runner-list';

new RunnerResolverHost({
    runners,
    connection: new IframeConnectionHost({
        eventListenerTarget: window,
        postMessageTarget: window,
        connectionStrategies: [
            new MessageChannelConnectionStrategyHost(),
            new RepeatConnectionStrategyHost(),
        ],
        plugins: [
            new DirectionInterceptPlugin({
                from: PROMISE_CONNECTION_IDENTIFIER_IFRAME_HOST,
                to: PROMISE_CONNECTION_IDENTIFIER_IFRAME_CLIENT,
            }),
        ],
    }),
}).run();

new RxRunnerResolverHost({
    runners,
    plugins: [
        new DirectionInterceptPlugin({
            from: RX_CONNECTION_IDENTIFIER_IFRAME_HOST,
            to: RX_CONNECTION_IDENTIFIER_IFRAME_CLIENT,
        }),
    ],
    connection: new IframeConnectionHost({
        eventListenerTarget: window,
        postMessageTarget: window,
        connectionStrategies: [
            new MessageChannelConnectionStrategyHost(),
            new RepeatConnectionStrategyHost(),
        ],
    }),
}).run();
