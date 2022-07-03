/// <reference lib="webworker" />

export { WorkerRunnerErrorCode } from './errors/error-code';
export { CODE_TO_ERROR_MAP, ICodeToErrorMap } from './errors/error-code-map';
export { IRunnerExecuteMessageConfig, IRunnerMessageConfig, WORKER_RUNNER_ERROR_MESSAGES } from './errors/error-message';
export { ISerializedError, ErrorSerializer } from './errors/error.serializer';
export { ConnectionWasClosedError, RunnerResolverHostDestroyError, RunnerDestroyError, RunnerExecuteError, RunnerInitError, RunnerNotFound } from './errors/runner-errors';
export { combineErrorConfig, IWorkerRunnerErrorConfig, WorkerRunnerError, WorkerRunnerUnexpectedError, WORKER_RUNNER_ERROR_CODE } from './errors/worker-runner-error';
export { RunnerResolverClientAction } from './runner-resolver/client/runner-resolver.client.actions';
export { RunnerResolverClientBase, IRunnerResolverClientBaseConfig } from './runner-resolver/client/runner-resolver.client';
export { RunnerResolverHostAction, IRunnerResolverHostAction } from './runner-resolver/host/runner-resolver.host.actions';
export { RunnerResolverHostBase, IRunnerResolverHostConfigBase } from './runner-resolver/host/runner-resolver.host';
export { IRunnerEnvironmentClientAction, IRunnerEnvironmentClientExecuteAction, IRunnerEnvironmentClientCloneAction, RunnerEnvironmentClientAction } from './runner-environment/client/runner-environment.client.actions';
export { IRunnerEnvironmentClientConfig, RunnerEnvironmentClient } from './runner-environment/client/runner-environment.client';
export { IRunnerEnvironmentClientCollectionConfig, RunnerEnvironmentClientCollection } from './runner-environment/client/runner-environment.client.collection';
export { IRunnerEnvironmentHostAction, IRunnerEnvironmentHostExecutedWithRunnerResultAction, IRunnerEnvironmentHostExecuteResultAction, RunnerEnvironmentHostAction } from './runner-environment/host/runner-environment.host.actions';
export { IRunnerEnvironmentHostConfig, RunnerEnvironmentHost } from './runner-environment/host/runner-environment.host';
export { ResolvedRunner, ResolvedRunnerArguments, ResolvedRunnerMethod } from './runner/resolved-runner';
export { RunnerController, RUNNER_ENVIRONMENT_CLIENT } from './runner/runner.controller';
export { Constructor, IRunnerMethodResult, IRunnerParameter, IRunnerSerializedMethodResult, IRunnerSerializedParameter, RunnerConstructor } from './types/constructor';
export { InstanceTypeOrUnknown } from './types/instance-type-or-unknown';
export { JsonLike, TransferableJsonLike } from './types/json-like';
export { AnyRunnerFromList, AvailableRunnerIdentifier, AvailableRunnersFromList, IRunnerIdentifierConfig, RunnerByIdentifier, RunnerIdentifier, RunnerIdentifierConfigList, RunnerToken } from './types/runner-identifier';
export { TransferRunnerData } from './utils/transfer-runner-data';
