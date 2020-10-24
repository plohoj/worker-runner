import { RunnersList } from "../../../runner/runner-bridge/runners-list.controller";
import { BaseWorkerRunnerResolver } from "../../worker/worker-runner.resolver";
import { BaseWorkerResolverBridgeFactory, IBaseWorkerResolverBridgeConfig } from "../worker/base-worker-resolver.bridge";
import { LocalWorkerResolverBridge } from "../worker/local-resolver.bridge";
import { IBaseResolverBridge } from './base-resolver.bridge'

export interface ILocalResolverBridgeConfig<L extends RunnersList> {
    workerRunnerResolverFactory: (
        config: {bridgeFactory: BaseWorkerResolverBridgeFactory;}
    ) => BaseWorkerRunnerResolver<L>;
}

export class LocalResolverBridge<L extends RunnersList> implements IBaseResolverBridge {
    public readonly workerRunnerResolver: BaseWorkerRunnerResolver<L>;
    private messageChanel = new MessageChannel();

    constructor (config: ILocalResolverBridgeConfig<L>) {
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
