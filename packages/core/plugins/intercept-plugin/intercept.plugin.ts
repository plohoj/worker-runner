import { IConnectionChannelInterceptor } from '../../connection-channel-interceptor/connection-channel-interceptor';
import { IAction } from '../../types/action';

export interface IInterceptPlugin {
    getInterceptorBeforeConnect?(): IConnectionChannelInterceptor;
    getInterceptorAfterConnect?(action: IAction): IConnectionChannelInterceptor;
}

export function isInterceptPlugin(plugin: unknown): plugin is IInterceptPlugin {
    return !!(plugin as IInterceptPlugin)?.getInterceptorBeforeConnect
        || !!(plugin as IInterceptPlugin)?.getInterceptorAfterConnect;
}
