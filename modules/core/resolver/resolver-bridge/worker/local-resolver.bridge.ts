import { IBaseWorkerResolverBridge, IBaseWorkerResolverBridgeConfig } from "./base-worker-resolver.bridge";

interface ILocalResolverBridgeConfig extends IBaseWorkerResolverBridgeConfig{
    port: MessagePort
}

export class LocalWorkerResolverBridge implements IBaseWorkerResolverBridge {
    constructor (config: ILocalResolverBridgeConfig) {
        config.newConnectionHandler(config.port);
    }

    public destroy(): void {
        // Stub
    }
}
