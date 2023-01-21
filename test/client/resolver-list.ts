import { DirectionConnectionIdentificationStrategyClient, MessageChannelConnectionStrategyClient, MessageChannelConnectionStrategyHost, RepeatConnectionStrategyClient, RepeatConnectionStrategyHost, RunnerIdentifierConfigList, WindowMessageEventConnectionClient, WorkerConnectionClient } from "@worker-runner/core";
import { RunnerResolverClient, RunnerResolverHost, RunnerResolverLocal } from "@worker-runner/promise";
import { RxRunnerResolverClient, RxRunnerResolverHost, RxRunnerResolverLocal } from '@worker-runner/rx';
import { PROMISE_CONNECTION_IDENTIFIER_IFRAME_CLIENT, PROMISE_CONNECTION_IDENTIFIER_IFRAME_HOST, PROMISE_CONNECTION_IDENTIFIER_WORKER, RX_CONNECTION_IDENTIFIER_IFRAME_CLIENT, RX_CONNECTION_IDENTIFIER_IFRAME_HOST, RX_CONNECTION_IDENTIFIER_WORKER } from '../common/connection-identifier';
import { runners } from "../common/runner-list";
import { ApartResolverFactory, IApartResolverFactoryConfig, IApartRunnerResolversManager } from './types/apart-resolver-factory';
import { ResolverFactory } from './types/resolver-factory';
import { RunnerApartResolverName, RunnerResolverConnectionSideName, RunnerResolverName, RunnerResolverPackageName } from './types/runner-resolver-name';
import { createApartClientHostResolvers } from './utils/apart-client-host-resolvers';

// TODO hack for karma-webpack
new Worker(new URL('../host/iframe-host', import.meta.url), {name: 'iframe-host'}).terminate();

function iframeFactory(source: URL): Window {
    const iframe = document.createElement('iframe');
    iframe.src = source.toString();
    // For IE11
    // eslint-disable-next-line unicorn/prefer-dom-node-append
    document.body.appendChild(iframe);
    const iframeWindow = iframe.contentWindow;
    if (!iframeWindow) {
        throw new Error('iframe window not available');
    }
    return iframeWindow;
}

const iframe = iframeFactory(new URL('../host/iframe-host.html', import.meta.url));
const worker = new Worker(new URL('../host/host', import.meta.url), {name: 'WorkerRunnerHost'});

const resolvers = {
    'Promise#Worker#MessageChannel': new RunnerResolverClient({
        runners,
        connection: new WorkerConnectionClient({
            target: worker,
            connectionStrategies: [new MessageChannelConnectionStrategyClient()],
            identificationStrategies: [
                new DirectionConnectionIdentificationStrategyClient({
                    clientIdentifier: PROMISE_CONNECTION_IDENTIFIER_WORKER,
                    hostIdentifier: PROMISE_CONNECTION_IDENTIFIER_WORKER,
                }),
            ],
        }),
    }),
    'Promise#Worker#Repeat': new RunnerResolverClient({
        runners,
        connection: new WorkerConnectionClient({
            target: worker,
            connectionStrategies: [new RepeatConnectionStrategyClient()],
            identificationStrategies: [
                new DirectionConnectionIdentificationStrategyClient({
                    clientIdentifier: PROMISE_CONNECTION_IDENTIFIER_WORKER,
                    hostIdentifier: PROMISE_CONNECTION_IDENTIFIER_WORKER,
                }),
            ],
        }),
    }),
    'Promise#Iframe#MessageChannel': new RunnerResolverClient({
        runners,
        connection: new WindowMessageEventConnectionClient({
            target: iframe,
            connectionStrategies: [new MessageChannelConnectionStrategyClient()],
            identificationStrategies: [
                new DirectionConnectionIdentificationStrategyClient({
                    clientIdentifier: PROMISE_CONNECTION_IDENTIFIER_IFRAME_CLIENT,
                    hostIdentifier: PROMISE_CONNECTION_IDENTIFIER_IFRAME_HOST,
                }),
            ],
        }),
    }),
    'Promise#Iframe#Repeat': new RunnerResolverClient({
        runners,
        connection: new WindowMessageEventConnectionClient({
            target: iframe,
            connectionStrategies: [new RepeatConnectionStrategyClient()],
            identificationStrategies: [
                new DirectionConnectionIdentificationStrategyClient({
                    clientIdentifier: PROMISE_CONNECTION_IDENTIFIER_IFRAME_CLIENT,
                    hostIdentifier: PROMISE_CONNECTION_IDENTIFIER_IFRAME_HOST,
                }),
            ],
        }),
    }),
    'Rx#Worker#MessageChannel': new RxRunnerResolverClient({
        runners,
        connection: new WorkerConnectionClient({
            target: worker,
            connectionStrategies: [new MessageChannelConnectionStrategyClient()],
            identificationStrategies: [
                new DirectionConnectionIdentificationStrategyClient({
                    clientIdentifier: RX_CONNECTION_IDENTIFIER_WORKER,
                    hostIdentifier: RX_CONNECTION_IDENTIFIER_WORKER,
                }),
            ],
        }),
    }),
    'Rx#Worker#Repeat': new RxRunnerResolverClient({
        runners,
        connection: new WorkerConnectionClient({
            target: worker,
            connectionStrategies: [new RepeatConnectionStrategyClient()],
            identificationStrategies: [
                new DirectionConnectionIdentificationStrategyClient({
                    clientIdentifier: RX_CONNECTION_IDENTIFIER_WORKER,
                    hostIdentifier: RX_CONNECTION_IDENTIFIER_WORKER,
                }),
            ],
        }),
    }),
    'Rx#Iframe#MessageChannel': new RxRunnerResolverClient({
        runners,
        connection: new WindowMessageEventConnectionClient({
            target: iframe,
            connectionStrategies: [new MessageChannelConnectionStrategyClient()],
            identificationStrategies: [
                new DirectionConnectionIdentificationStrategyClient({
                    clientIdentifier: RX_CONNECTION_IDENTIFIER_IFRAME_CLIENT,
                    hostIdentifier: RX_CONNECTION_IDENTIFIER_IFRAME_HOST,
                }),
            ],
        }),
    }),
    'Rx#Iframe#Repeat': new RxRunnerResolverClient({
        runners,
        connection: new WindowMessageEventConnectionClient({
            target: iframe,
            connectionStrategies: [new RepeatConnectionStrategyClient()],
            identificationStrategies: [
                new DirectionConnectionIdentificationStrategyClient({
                    clientIdentifier: RX_CONNECTION_IDENTIFIER_IFRAME_CLIENT,
                    hostIdentifier: RX_CONNECTION_IDENTIFIER_IFRAME_HOST,
                }),
            ],
        }),
    }),
} satisfies Record<
    RunnerResolverName<RunnerResolverPackageName, Exclude<RunnerResolverConnectionSideName, 'Local'>>,
    RunnerResolverClient | RxRunnerResolverClient
>;

export const allRunnerResolversFactories = {
    'Promise#Worker#MessageChannel': () => resolvers['Promise#Worker#MessageChannel'],
    'Promise#Worker#Repeat': () => resolvers['Promise#Worker#Repeat'],
    'Promise#Iframe#MessageChannel': () => resolvers['Promise#Iframe#MessageChannel'],
    'Promise#Iframe#Repeat': () => resolvers['Promise#Iframe#Repeat'],
    'Promise#Local#MessageChannel': <T extends RunnerIdentifierConfigList = typeof runners>(runnersList?: T) => new RunnerResolverLocal({
        runners: runnersList || runners,
        connectionStrategy: new MessageChannelConnectionStrategyHost(),
     }),
    'Promise#Local#Repeat': <T extends RunnerIdentifierConfigList = typeof runners>(runnersList?: T) => new RunnerResolverLocal({
        runners: runnersList || runners,
        connectionStrategy: new RepeatConnectionStrategyHost(),
    }),
    'Rx#Worker#MessageChannel': () => resolvers['Rx#Worker#MessageChannel'],
    'Rx#Worker#Repeat': () => resolvers['Rx#Worker#Repeat'],
    'Rx#Iframe#MessageChannel': () => resolvers['Rx#Iframe#MessageChannel'],
    'Rx#Iframe#Repeat': () => resolvers['Rx#Iframe#Repeat'],
    'Rx#Local#MessageChannel': <T extends RunnerIdentifierConfigList = typeof runners>(runnersList?: T) => new RxRunnerResolverLocal({
        runners: runnersList || runners,
        connectionStrategy: new MessageChannelConnectionStrategyHost(),
    }),
    'Rx#Local#Repeat': <T extends RunnerIdentifierConfigList = typeof runners>(runnersList?: T) => new RxRunnerResolverLocal({
        runners: runnersList || runners,
        connectionStrategy: new RepeatConnectionStrategyHost(),
    }),
} satisfies Record<RunnerResolverName, ResolverFactory>;

export const apartResolversFactories = {
    'Promise#Apart': <
        CL extends RunnerIdentifierConfigList,
        HL extends RunnerIdentifierConfigList,
    >(config: IApartResolverFactoryConfig<CL, HL>): IApartRunnerResolversManager<
        RunnerResolverClient<CL>, RunnerResolverHost<HL>
    > => createApartClientHostResolvers({
        ...config,
        runnerResolverClientConstructor: RunnerResolverClient,
        runnerResolverHostConstructor: RunnerResolverHost
    }),
    'Rx#Apart': <
        CL extends RunnerIdentifierConfigList,
        HL extends RunnerIdentifierConfigList,
    >(config: IApartResolverFactoryConfig<CL, HL>): IApartRunnerResolversManager<
    RunnerResolverClient<CL>, RunnerResolverHost<HL>
    > => createApartClientHostResolvers({
        ...config,
        runnerResolverClientConstructor: RxRunnerResolverClient as typeof RunnerResolverClient,
        runnerResolverHostConstructor: RxRunnerResolverHost
    }),
} satisfies Record<RunnerApartResolverName, ApartResolverFactory>
