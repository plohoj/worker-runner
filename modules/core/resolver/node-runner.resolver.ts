import { NodeAction } from '../actions/node.actions';
import { errorActionToRunnerError, IRunnerError } from '../actions/runner-error';
import { RunnerErrorCode, RunnerErrorMessages } from '../errors/runners-errors';
import { resolveRunnerBridgeConstructor } from '../runner/bridge-constructor.resolver';
import { IRunnerBridgeConstructor } from '../runner/runner-bridge';
import { RunnerConstructor } from '../types/constructor';
import { WorkerBridge } from '../worker-bridge';
import { IRunnerResolverConfigBase } from './base-runner.resolver';

export interface INodeRunnerResolverConfigBase<R extends RunnerConstructor> extends IRunnerResolverConfigBase<R> {
    workerName?: string;
    /** @default 'worker.js' */
    workerPath?: string;
}

const DEFAULT_RUNNER_RESOLVER_BASE_CONFIG: Required<INodeRunnerResolverConfigBase<never>> = {
    workerName: 'Worker Runner',
    runners: [] as never[],
    workerPath: 'worker.js',
};

export abstract class NodeRunnerResolverBase<R extends RunnerConstructor> {

    protected runnerBridgeConstructors = new Array<IRunnerBridgeConstructor<R>>();
    protected workerBridge?: WorkerBridge;
    protected config: Required<INodeRunnerResolverConfigBase<R>>;

    constructor(config: INodeRunnerResolverConfigBase<R>) {
        this.config = {
            ...DEFAULT_RUNNER_RESOLVER_BASE_CONFIG,
            ...config,
        };
    }

    public async run(): Promise<void> {
        this.runnerBridgeConstructors = this.config.runners.map(runner => resolveRunnerBridgeConstructor(runner));
        this.workerBridge = await this.buildWorkerBridge();
    }

    public abstract async resolve<RR extends R>(runner: RR, ...args: ConstructorParameters<RR>): Promise<{}>;

    /** @returns instanceId */
    protected async sendInitAction(
        runnerId: number,
        args: ConstructorParameters<R>,
    ): Promise<number> {
        if (runnerId < 0) {
            throw {
                error: RunnerErrorMessages.CONSTRUCTOR_NOT_FOUND,
                errorCode: RunnerErrorCode.RUNNER_INIT_CONSTRUCTOR_NOT_FOUND,
            } as IRunnerError;
        }
        const workerBridge = this.getWorkerBridge();
        const instanceId = workerBridge.resolveNewRunnerInstanceId();
        try {
            await workerBridge.execute({
                type: NodeAction.INIT,
                instanceId,
                runnerId,
                arguments: args,
            });
        } catch (error) {
            throw errorActionToRunnerError(error);
        }
        return instanceId;
    }

    /**
     * Destroy workers for runnable resolver
     * @param force Destroy by skipping the call the destruction method on the remaining instances
     */
    public async destroy(force = false): Promise<void> {
        if (this.workerBridge) {
            await this.workerBridge.destroy(force);
        }
        this.workerBridge = undefined;
    }

    protected async buildWorkerBridge(): Promise<WorkerBridge> {
        const bridge = new WorkerBridge({
            workerPath: this.config.workerPath,
            workerName: `${this.config.workerName}`,
        });
        await bridge.init();
        return bridge;
    }

    protected getWorkerBridge(): WorkerBridge {
        if (!this.workerBridge) {
            throw new Error('Worker was not started');
        }
        return this.workerBridge;
    }

}
