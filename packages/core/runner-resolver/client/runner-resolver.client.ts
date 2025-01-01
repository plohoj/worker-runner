import { IBaseConnectionClient, IEstablishedConnectionClientData } from '../../connections/base/base.connection-client';
import { DisconnectReason } from '../../connections/base/disconnect-reason';
import { ConnectionClosedError } from '../../errors/runner-errors';
import { isInterceptPlugin } from '../../plugins/intercept-plugin/intercept.plugin';
import { IPlugin } from '../../plugins/plugins';
import { RunnerDefinitionCollection } from '../../runner/runner-definition.collection';
import { RunnerController } from '../../runner/runner.controller';
import { IRunnerParameter } from '../../types/constructor';
import { AvailableRunnerIdentifier, RunnerIdentifierConfigList } from "../../types/runner-identifier";
import { ConnectedRunnerResolverClient } from './connected-runner-resolver.client';

export type IRunnerResolverClientBaseConfig<L extends RunnerIdentifierConfigList> = {
    connection: IBaseConnectionClient;
    runners?: L;
    plugins?: IPlugin[];
};

/**
 * The main class for working with Runners in the client area.
 * Allows to pass arguments for building the Runner constructor in the host area.
 * After building the Runner in the host area, the client area will get the instance of the class
 * with methods to control an instance of the original Runner.
 * 
 * @example
 * ```typescript
 *   // #region Common code
 *   class ExampleRunner { // will use in the client area for typing only
 *       calc(a: number, b: number): number {
 *           return a + b;
 *       }
 *   }
 *   const EXAMPLE_RUNNER_TOKEN = 'example-token';
 *   // #endregion
 *
 *   // #region Client area
 *   const exampleRunnerIdentifier = new RunnerTokenIdentifier<typeof ExampleRunner>({token: EXAMPLE_RUNNER_TOKEN});
 *
 *   const worker = new Worker(new URL('/worker-host', import.meta.url), {name: 'WorkerRunnerHost'});
 *   const runnerResolver = new RunnerResolverClient({
 *       connection: new WorkerConnectionClient({
 *           target: worker,
 *           connectionStrategies: [new MessageChannelConnectionStrategyClient()],
 *       }),
 *   })
 *   await runnerResolver.run();
 *
 *   const exampleRunner = await runnerResolver.resolve(exampleRunnerIdentifier);
 *   console.log(await exampleRunner.calc(1, 2)) // Log: 3 
 *   await runnerResolver.destroy();
 *   // #endregion
 *
 *   // #region WebWorker area
 *   new RunnerResolverHost({
 *       runners: [{token: EXAMPLE_RUNNER_TOKEN, runner: ExampleRunner}],
 *       connection: new WorkerConnectionHost({
 *           target: self,
 *           connectionStrategies: [new MessageChannelConnectionStrategyHost()],
 *       }),
 *   }).run()
 *   // #endregion
 * ```
 */
export abstract class RunnerResolverClientBase<L extends RunnerIdentifierConfigList>  {

    protected readonly runnerDefinitionCollection: RunnerDefinitionCollection<L>;
    protected connectedResolver?: ConnectedRunnerResolverClient;

    private readonly connection: IBaseConnectionClient;
    private readonly plugins?: IPlugin[];

    constructor(config: IRunnerResolverClientBaseConfig<L>) {
        this.runnerDefinitionCollection = new RunnerDefinitionCollection({
            runners: config.runners || [],
        });
        this.plugins = config.plugins;
        this.connection = config.connection;
        this.connection.registerPlugins?.(
            this.plugins?.filter(isInterceptPlugin) || []
        );
    }

    /**
     * Launches communication with RunnerResolver in the host area
     * through the connection specified in the configuration.
     */
    public run(): Promise<void> | void {
        const establishedConnectionData$ = this.connection.connect();
        if (establishedConnectionData$ instanceof Promise) {
            return establishedConnectionData$
                .then(establishedConnectionData => this.buildAndRunConnectedResolver(establishedConnectionData));
        }
        this.buildAndRunConnectedResolver(establishedConnectionData$);
    }

    /**
     * Passes arguments for building the Runner constructor to the host area.
     * After building the Runner in the host area, the client area will get the instance of the class
     * with methods to control an instance of the original Runner.
     * @returns The instance of the class with methods to control an instance of the original Runner.
     */
    public async resolve(identifier: AvailableRunnerIdentifier<L>, ...args: IRunnerParameter[]): Promise<RunnerController> {
        if (!this.connectedResolver) { // TODO Check connection validation everywhere
            throw new ConnectionClosedError({ disconnectReason: DisconnectReason.ConnectionNotYetEstablished });
        }
        return this.connectedResolver.resolve(identifier, ...args);
    }

    /**
     * Destroying of all resolved Runners instance.
     * After destroying all instances of resolved Runners, the client area informs the host area to stop communicating.
     * After the communication is terminated, it can be restarted using the {@link run} method.
     *
     * WARNING: The original connection through which the communication happens will not be closed,
     * it must be closed manually.
     */
    public async destroy(): Promise<void> {
        try {
            if (!this.connectedResolver) {
                throw new ConnectionClosedError({ disconnectReason: DisconnectReason.ConnectionNotYetEstablished });
            }
            try {
                await this.connectedResolver.destroy();
            } finally {
                this.connectedResolver = undefined;
            }
        } finally {
            await this.connection.stop?.();
        }
    }

    private buildAndRunConnectedResolver(establishedConnectionData: IEstablishedConnectionClientData): void {
        this.connectedResolver = new ConnectedRunnerResolverClient({
            connectionChannel: establishedConnectionData.connectionChannel,
            connectionStrategy: establishedConnectionData.connectionStrategy,
            runnerDefinitionCollection: this.runnerDefinitionCollection,
            plugins: this.plugins,
        });
        this.connectedResolver.run();
    }
}
