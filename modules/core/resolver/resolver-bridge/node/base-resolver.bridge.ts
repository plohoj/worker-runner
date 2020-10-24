export interface IBaseResolverBridge {
    connect(): Promise<MessagePort>;
}
