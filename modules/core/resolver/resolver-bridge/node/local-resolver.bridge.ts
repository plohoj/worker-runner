import { RunnerConstructor } from "../../../types/constructor";
import { BaseWorkerRunnerResolver } from "../../worker/worker-runner.resolver";
import { BaseWorkerResolverBridgeFactory, IBaseWorkerResolverBridgeConfig } from "../worker/base-worker-resolver.bridge";
import { LocalWorkerResolverBridge } from "../worker/local-resolver.bridge";
import { IBaseResolverBridge } from './base-resolver.bridge'

export interface ILocalResolverBridgeConfig<R extends RunnerConstructor> {
    workerRunnerResolverFactory: (
        config: {bridgeFactory: BaseWorkerResolverBridgeFactory;}
    ) => BaseWorkerRunnerResolver<R>;
}

export class LocalResolverBridge<R extends RunnerConstructor> implements IBaseResolverBridge {
    public readonly workerRunnerResolver: BaseWorkerRunnerResolver<R>;
    private messageChanel = new MessageChannel();

    constructor (config: ILocalResolverBridgeConfig<R>) {
        this.workerRunnerResolver = config.workerRunnerResolverFactory({
            bridgeFactory: (config: IBaseWorkerResolverBridgeConfig) => {
                return new LocalWorkerResolverBridge({
                    ...config,
                    port: this.messageChanel.port1,
                })
            }
        });
        this.workerRunnerResolver.run();
    }

    public async connect(): Promise<MessagePort> {
        return this.messageChanel.port2;
    }
}
