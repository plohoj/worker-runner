import { LocalPortalConnectionChannel } from '../../connection-channels/local-portal.connection-channel';
import { DisconnectReason } from '../../connections/base/disconnect-reason';
import { ConnectionClosedError } from '../../errors/runner-errors';
import { RunnerController } from '../../runner/runner.controller';
import { RunnerConstructor } from '../../types/constructor';
import { RunnerIdentifierConfigList } from '../../types/runner-identifier';
import { RunnerResolverClientBase } from '../client/runner-resolver.client';
import { RunnerResolverHostBase } from '../host/runner-resolver.host';


/** Used as an interface */
export declare class RunnerResolverLocalBase<L extends RunnerIdentifierConfigList> extends RunnerResolverClientBase<L> {
    declare protected readonly host: RunnerResolverHostBase<L>;
}

// TODO Need to implement the configuration token after adding constructing resolver
/**
 * Wraps the Runner and returns a Runner control object that will call the methods of the original Runner instance.
 * The original Runner instance will be executed in the same area in which it was wrapped.
 */
export function runnerResolverLocalWrapRunnerFunction<R extends InstanceType<RunnerConstructor>>(
    this: RunnerResolverLocalBase<RunnerIdentifierConfigList>,
    runnerInstance: R
): RunnerController {
    if (!this.connectedResolver) {
        throw new ConnectionClosedError({ disconnectReason: DisconnectReason.ConnectionNotYetEstablished });
    }
    const localChannels = LocalPortalConnectionChannel.build();
    const resolvedRunner = this.connectedResolver
        .wrapRunner(runnerInstance, localChannels[0]) as RunnerController;
    this.host.wrapRunner(runnerInstance, localChannels[1]);
    return resolvedRunner;
}
