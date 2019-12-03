import { Constructor } from "@core/constructor";
import { NodeCommand } from "../../../src/commands/node-commands";
import { errorCommandToRunnerError, IRunnerError } from "../../../src/commands/runner-error";
import { RunnerErrorCode, RunnerErrorMessages } from "../../../src/errors/runners-errors";
import { resolveRunnerBridgeConstructor } from "../../../src/runner/bridge-constructor.resolver";
import { IRunnerBridgeConstructor } from "../../../src/runner/runner-bridge";
import { WorkerBridge } from "../../../src/worker-bridge/worker-bridge";
import { WorkerBridgeBase } from "../../../src/worker-bridge/worker-bridge-base";
import { IRunnerResolverConfigBase } from "./base-runner.resolver";

export interface INodeRunnerResolverConfigBase<R extends Constructor> extends IRunnerResolverConfigBase<R> {
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
}

export abstract class NodeRunnerResolverBase<R extends Constructor> {
    private workerBridges?: WorkerBridgeBase[];
    private workerIndex = 0;
    private runnerBridgeConstructors = new Array<IRunnerBridgeConstructor<R>>();
    protected config: Required<INodeRunnerResolverConfigBase<R>>;

    constructor(config: INodeRunnerResolverConfigBase<R>) {
        this.config = {
            ...DEFAULT_RUNNER_RESOLVER_BASE_CONFIG,
            ...config,
        }
    }

    public async run(): Promise<void> {
        this.runnerBridgeConstructors = this.config.runners.map(runner => resolveRunnerBridgeConstructor(runner));
        // if (this.config.devMode) {
        //     this.workerBridges = [new WorkerBridgeForDev(this as any)];
        //     return;
        // }
        const workerBridgesInits$ = new Array<Promise<WorkerBridge>>();
        for (let i = 0; i < this.config.totalWorkers; i++) {
            const bridge = new WorkerBridge({
                workerPath: this.config.workerPath,
                workerName: `${this.config.namePrefix}${i}`,
            });
            workerBridgesInits$.push(bridge.init().then(() => bridge))
        }
        const workerBridges = await Promise.all(workerBridgesInits$);
        this.workerBridges = workerBridges;
    }

    public async resolve<RR extends R>(runner: RR, ...args: ConstructorParameters<RR>): Promise<InstanceType<IRunnerBridgeConstructor<RR>>> {
        const runnerId = this.config.runners.indexOf(runner);
        if (runnerId < 0) {
            throw {
                error: RunnerErrorMessages.CONSTRUCTOR_NOT_FOUND,
                errorCode: RunnerErrorCode.RUNNER_INIT_CONSTRUCTOR_NOT_FOUND,
            } as IRunnerError;
        }
        const workerBridge = this.getNextWorkerBridge();
        try {
            await workerBridge.execCommand({
                type: NodeCommand.INIT,
                instanceId: workerBridge.resolveNewRunnerInstanceId(),
                runnerId,
                arguments: args,
            });
        } catch (error) {
            throw errorCommandToRunnerError(error);
        }
        return new (this.runnerBridgeConstructors[runnerId])(workerBridge, runnerId);
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
