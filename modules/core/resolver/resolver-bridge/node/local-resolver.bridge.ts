import { RunnersList } from "../../../runner/runner-bridge/runners-list.controller";
import { BaseWorkerRunnerResolver } from "../../worker/worker-runner.resolver";
import { ResolverBridge } from "./resolver.bridge";

export interface ILocalResolverBridgeConfig<L extends RunnersList> {
    workerRunnerResolverFactory: (
        config: { connections: [MessagePort] }
    ) => BaseWorkerRunnerResolver<L>;
}

export class LocalResolverBridge<L extends RunnersList> extends ResolverBridge {
    public readonly workerRunnerResolver: BaseWorkerRunnerResolver<L>;

    constructor (config: ILocalResolverBridgeConfig<L>) {
        const messageChanel = new MessageChannel();
        messageChanel.port1.start();
        messageChanel.port2.start();
        super({
            connection: messageChanel.port1,
        });
        this.workerRunnerResolver = config.workerRunnerResolverFactory({
            connections: [ messageChanel.port2]
        });
        this.workerRunnerResolver.run();
    }
}
