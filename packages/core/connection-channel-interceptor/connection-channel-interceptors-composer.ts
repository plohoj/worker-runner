import { BaseConnectionChannel } from '../connection-channels/base.connection-channel';
import { IAction } from '../types/action';
import { IConnectionChannelInterceptResultOptions, IConnectionChannelInterceptor, IConnectionChannelInterceptResult, ConnectionChannelInterceptorRejectEnum } from './connection-channel-interceptor';

export interface IConnectionChannelInterceptorsComposerConfig {
    connectionChannel: BaseConnectionChannel;
}

export class ConnectionChannelInterceptorsComposer implements IConnectionChannelInterceptor {
    private readonly connectionChannel: BaseConnectionChannel;
    private readonly interceptors = new Set<IConnectionChannelInterceptor>;
    private destroyPromises = 0;
    private destroyPromise$?: Promise<void>;
    private destroyPromiseResolve?: () => void;

    constructor(config: IConnectionChannelInterceptorsComposerConfig) {
        this.connectionChannel = config.connectionChannel;
    }

    public addInterceptors(...interceptors: IConnectionChannelInterceptor[]): void {
        for (const interceptor of interceptors) {
            interceptor.register?.(this.connectionChannel);
            this.interceptors.add(interceptor);
        }
        // If the destroying process is running
        if (this.destroyPromise$) {
            this.checkInterceptorsDestroy(interceptors);
        }
    }

    public removeInterceptors(...interceptors: IConnectionChannelInterceptor[]): void {
        for (const interceptor of interceptors) {
            interceptor.destroy?.();
            this.interceptors.delete(interceptor);
        }
    }

    public interceptSend(action: IAction): IConnectionChannelInterceptResult {
        return this.innerIntercept(action, 
            (interceptor, action) => interceptor.interceptSend?.(action),
            options => {
                for (const interceptor of this.interceptors) {
                    interceptor.interceptSendResult?.(options);
                }
            }
        );
    }

    public interceptReceive(action: IAction): IConnectionChannelInterceptResult {
        return this.innerIntercept(action, 
            (interceptor, action) => interceptor.interceptReceive?.(action),
            options => {
                for (const interceptor of this.interceptors) {
                    interceptor.interceptReceiveResult?.(options);
                }
            }
        );
    }

    public destroy(): void | Promise<void> {
        if (this.destroyPromise$) {
            return this.destroyPromise$;
        }
        this.destroyPromise$ = new Promise((resolve) => {
            this.destroyPromiseResolve = resolve;
        });
        this.checkInterceptorsDestroy(this.interceptors);
        if (this.destroyPromises) {
            return this.destroyPromise$.finally(() => this.destroyProcess());
        }
        this.destroyProcess();
    }

    private destroyProcess(): void {
        this.destroyPromise$ = undefined;
        this.destroyPromiseResolve = undefined;
        for (const interceptor of this.interceptors) {
            interceptor.destroy?.();
        }
        this.interceptors.clear();
    }

    private checkInterceptorsDestroy(interceptors: Iterable<IConnectionChannelInterceptor>): void {
        for (const interceptor of interceptors) {
            const canBeDestroyedResult = interceptor.canBeDestroyed?.();
            if (canBeDestroyedResult instanceof Promise) {
                this.destroyPromises++;
                void canBeDestroyedResult.finally(() => {
                    this.destroyPromises--;
                    if (this.destroyPromises === 0) {
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        this.destroyPromiseResolve!();
                    }
                });
            }
        }
    }

    private innerIntercept(
        initialAction: IAction,
        intercept: (
            interceptor: IConnectionChannelInterceptor,
            action: IAction
        ) => IConnectionChannelInterceptResult | undefined,
        interceptResult: (options: IConnectionChannelInterceptResultOptions) => void,
    ): IConnectionChannelInterceptResult {
        const interceptResultValue: IConnectionChannelInterceptResultOptions = {
            action: initialAction,
            initialAction,
            rejectedBy: [],
        };
        for (const interceptor of this.interceptors) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const iteratedInterceptResult = intercept(interceptor, interceptResultValue.action!);
            if (!iteratedInterceptResult) {
                continue;
            }
            if (iteratedInterceptResult.rejected === ConnectionChannelInterceptorRejectEnum.Hard) {
                interceptResult({
                    initialAction,
                    ...iteratedInterceptResult,
                });
                return interceptResultValue;
            }
            if (iteratedInterceptResult.action) {
                interceptResultValue.action = iteratedInterceptResult.action;
            }
            if (iteratedInterceptResult.rejected) {
                interceptResultValue.rejected = iteratedInterceptResult.rejected;
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                interceptResultValue.rejectedBy!.push(interceptor);
            }
        }
        interceptResult(interceptResultValue);
        return interceptResultValue;
    }
}
