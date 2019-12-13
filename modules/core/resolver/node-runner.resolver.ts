import { RunnerConstructor } from '@core/types/constructor';
import { NodeAction } from '../actions/node-actions';
import { errorActionToRunnerError, IRunnerError } from '../actions/runner-error';
import { RunnerErrorCode, RunnerErrorMessages } from '../errors/runners-errors';
import { resolveRunnerBridgeConstructor } from '../runner/bridge-constructor.resolver';
import { IRunnerBridgeConstructor } from '../runner/runner-bridge';
import { WorkerBridge } from '../worker-bridge/worker-bridge';
import { WorkerBridgeBase } from '../worker-bridge/worker-bridge-base';
import { IRunnerResolverConfigBase } from './base-runner.resolver';

export interface INodeRunnerResolverConfigBase<R extends RunnerConstructor> extends IRunnerResolverConfigBase<R> {
    /** @default 1 */
    totalWorkers?: number;
    namePrefix?: string;
    /** @default 'worker.js' */
    workerPath?: string;
}

const DEFAULT_RUNNER_RESOLVER_BASE_CONFIG: Required<INodeRunnerResolverConfigBase<never>> = {
    totalWorkers: 1,
    namePrefix: 'Runners Worker #',
    runners: [] as never[],
    workerPath: 'worker.js',
};

export abstract class NodeRunnerResolverBase<R extends RunnerConstructor> {
    private workerIndex = 0;
    protected runnerBridgeConstructors = new Array<IRunnerBridgeConstructor<R>>();
    protected workerBridges?: WorkerBridgeBase[];
    protected config: Required<INodeRunnerResolverConfigBase<R>>;

    constructor(config: INodeRunnerResolverConfigBase<R>) {
        this.config = {
            ...DEFAULT_RUNNER_RESOLVER_BASE_CONFIG,
            ...config,
        };
    }

    public async run(): Promise<void> {
        this.runnerBridgeConstructors = this.config.runners.map(runner => resolveRunnerBridgeConstructor(runner));
        this.workerBridges = await this.buildWorkerBridge();
    }

    public abstract async resolve<RR extends R>(runner: RR, ...args: ConstructorParameters<RR>): Promise<{}>;

    protected async sendInitAction(runnerId: number, ...args: ConstructorParameters<R>): Promise<WorkerBridgeBase> {

        if (runnerId < 0) {
            throw {
                error: RunnerErrorMessages.CONSTRUCTOR_NOT_FOUND,
                errorCode: RunnerErrorCode.RUNNER_INIT_CONSTRUCTOR_NOT_FOUND,
            } as IRunnerError;
        }
        const workerBridge = this.getNextWorkerBridge();
        try {
            await workerBridge.execute({
                type: NodeAction.INIT,
                instanceId: workerBridge.resolveNewRunnerInstanceId(),
                runnerId,
                arguments: args,
            });
        } catch (error) {
            throw errorActionToRunnerError(error);
        }
        return workerBridge;
    }

    /**
     * Destroy workers for runnable resolver
     * @param force Destroy by skipping the call the destruction method on the remaining instances
     */
    public async destroy(force = false): Promise<void> {
        if (this.workerBridges) {
            await Promise.all(this.workerBridges.map(workerBridge => workerBridge.destroy(force)));
        }
        this.workerBridges = undefined;
    }

    protected async buildWorkerBridge(): Promise<WorkerBridgeBase[]> {
        const workerBridgesInits$ = new Array<Promise<WorkerBridge>>();
        for (let i = 0; i < this.config.totalWorkers; i++) {
            const bridge = new WorkerBridge({
                workerPath: this.config.workerPath,
                workerName: `${this.config.namePrefix}${i}`,
            });
            workerBridgesInits$.push(bridge.init().then(() => bridge));
        }
        return Promise.all(workerBridgesInits$);
    }

    private getNextWorkerBridge(): WorkerBridgeBase {
        if (!this.workerBridges || this.workerBridges.length === 0) {
            throw new Error('Workers was not started');
        }
        const workerIndex = this.workerIndex++;
        if (this.workerIndex >= this.workerBridges.length) {
            this.workerIndex = 0;
        }
        return this.workerBridges[workerIndex];
    }

}
