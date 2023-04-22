/// <reference lib="webworker" />

export { ActionController } from './action-controller/action-controller';
export { ProxyReceiveConnectionChannelInterceptor } from './connection-channel-interceptor/proxy-receive.connection-channel-interceptor';
export { LocalPortalConnectionChannel } from './connection-channels/local-portal.connection-channel';
export { ProxyConnectionChannel } from './connection-channels/proxy.connection-channel';
export { DirectionInterceptPlugin } from './plugins/intercept-plugin/direction/direction-intercept.plugin';
export { BaseConnectionStrategyClient, IPreparedForSendRunnerDataClient } from './connection-strategies/base/base.connection-strategy-client';
export { BaseConnectionStrategyHost } from './connection-strategies/base/base.connection-strategy-host';
export { DataForSendRunner } from './connection-strategies/base/prepared-for-send-data';
export { MessageChannelConnectionStrategyClient } from './connection-strategies/message-channel/message-channel.connection-strategy-client';
export { MessageChannelConnectionStrategyHost } from './connection-strategies/message-channel/message-channel.connection-strategy-host';
export { RepeatConnectionStrategyClient } from './connection-strategies/repeat/repeat.connection-strategy-client';
export { RepeatConnectionStrategyHost } from './connection-strategies/repeat/repeat.connection-strategy-host';
export { IframeConnectionClient } from './connections/iframe/iframe.connection-client';
export { IframeConnectionHost } from './connections/iframe/iframe.connection-host';
export { MessageEventConnectionClient } from './connections/message-event/message-event.connection-client';
export { MessageEventConnectionHost } from './connections/message-event/message-event.connection-host';
export { PortalConnectionClient } from './connections/portal/portal.connection-client';
export { PortalConnectionHost } from './connections/portal/portal.connection-host';
export { SharedWorkerConnectionClient } from './connections/shared-worker/shared-worker.connection-client';
export { SharedWorkerConnectionHost } from './connections/shared-worker/shared-worker.connection-host';
export { WindowMessageEventConnectionClient } from './connections/window-message-event/window-message-event.connection-client';
export { WindowMessageEventConnectionHost } from './connections/window-message-event/window-message-event.connection-host';
export { WorkerConnectionClient } from './connections/worker/worker.connection-client';
export { WorkerConnectionHost } from './connections/worker/worker.connection-host';
export { ICoreCodeToErrorMap } from './errors/core-error-code-map';
export { IRunnerExecuteMessageConfig, IRunnerMessageConfig, WORKER_RUNNER_ERROR_MESSAGES } from './errors/error-message';
export { normalizeError } from './errors/normalize-error';
export { ConnectionClosedError, RunnerDataTransferError, RunnerDestroyError, RunnerExecuteError, RunnerInitError, RunnerNotFound, RunnerResolverHostDestroyError } from './errors/runner-errors';
export { combineErrorConfig, IWorkerRunnerErrorConfig, WorkerRunnerError, WorkerRunnerUnexpectedError } from './errors/worker-runner-error';
export { ISerializedError } from './plugins/error-serialization-plugin/base/error-serialization-plugin-data';
export { ErrorSerializationPluginsResolver } from './plugins/error-serialization-plugin/base/error-serialization-plugins.resolver';
export { IErrorSerializationPlugin } from './plugins/error-serialization-plugin/base/error-serialization.plugin';
export { CoreErrorCodeMapSerializationPlugin } from './plugins/error-serialization-plugin/core-error-code-map/core-error-code-map-serialization.plugin';
export { IPluginsPack } from './plugins/pack/plugins-pack';
export { PLUGIN_CANNOT_PROCESS_DATA } from './plugins/plugin-cannot-process-data';
export { IPlugin } from './plugins/plugins';
export { ITransferPluginPreparedData, ITransferPluginReceivedData, TransferPluginDataType, TransferPluginReceivedData, TransferPluginSendData } from './plugins/transfer-plugin/base/transfer-plugin-data';
export { ITransferPluginsResolverReceiveDataConfig, TransferPluginsResolver } from './plugins/transfer-plugin/base/transfer-plugins.resolver';
export { ITransferPlugin } from './plugins/transfer-plugin/base/transfer.plugin';
export { ITransferPluginController, ITransferPluginControllerConfig, ITransferPluginControllerReceiveDataConfig, ITransferPluginControllerTransferDataConfig } from './plugins/transfer-plugin/base/transfer.plugin-controller';
export { RunnerTransferPlugin } from './plugins/transfer-plugin/runner-transfer-plugin/runner-transfer.plugin';
export { RunnerEnvironmentClient, RunnerEnvironmentClientFactory } from './runner-environment/client/runner-environment.client';
export { IRunnerEnvironmentClientAction, IRunnerEnvironmentClientCallAction, IRunnerEnvironmentClientCloneAction, RunnerEnvironmentClientAction } from './runner-environment/client/runner-environment.client.actions';
export { RunnerEnvironmentClientCollection } from './runner-environment/client/runner-environment.client.collection';
export { IRunnerEnvironmentHostConfig, RunnerEnvironmentHost } from './runner-environment/host/runner-environment.host';
export { IRunnerEnvironmentHostAction, RunnerEnvironmentHostAction } from './runner-environment/host/runner-environment.host.actions';
export { IRunnerResolverClientBaseConfig, RunnerResolverClientBase } from './runner-resolver/client/runner-resolver.client';
export { RunnerResolverClientAction } from './runner-resolver/client/runner-resolver.client.actions';
export { IRunnerResolverHostConfigBase, RunnerResolverHostBase } from './runner-resolver/host/runner-resolver.host';
export { IRunnerResolverHostAction, RunnerResolverHostAction } from './runner-resolver/host/runner-resolver.host.actions';
export { runnerResolverLocalWrapRunnerFunction, type RunnerResolverLocalBase } from './runner-resolver/local/runner-resolver.client';
export { ResolvedRunner, ResolvedRunnerArguments, ResolvedRunnerMethod } from './runner/resolved-runner';
export { RunnerDefinitionCollection } from './runner/runner-definition.collection';
export { RunnerController, RUNNER_ENVIRONMENT_CLIENT } from './runner/runner.controller';
export { TransferRunnerData } from './transfer-data/transfer-runner-data';
export { IAction } from './types/action';
export { Constructor, IRunnerMethodResult, IRunnerParameter, IRunnerSerializedMethodResult, IRunnerSerializedParameter, RunnerConstructor } from './types/constructor';
export { InstanceTypeOrUnknown } from './types/instance-type-or-unknown';
export { JsonLike, TransferableJsonLike } from './types/json-like';
export { AnyRunnerFromList, AvailableRunnerIdentifier, AvailableRunnersFromList, IRunnerIdentifierConfig, RunnerByIdentifier, RunnerIdentifier, RunnerIdentifierConfigList, RunnerToken } from './types/runner-identifier';
export { EventHandlerController } from './utils/event-handler-controller';
export { WorkerRunnerIdentifier } from './utils/identifier-generator';
