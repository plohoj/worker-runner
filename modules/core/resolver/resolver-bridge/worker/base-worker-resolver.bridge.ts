export interface IBaseWorkerResolverBridgeConfig {
    newConnectionHandler: (messagePort: MessagePort) => void;
}

export interface IBaseWorkerResolverBridge {
    destroy(): void;
}

export type BaseWorkerResolverBridgeFactory = (config: IBaseWorkerResolverBridgeConfig) => IBaseWorkerResolverBridge;
