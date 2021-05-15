import { WORKER_RUNNER_ERROR_MESSAGES } from "../../errors/error-message";
import { RunnerNotFound } from "../../errors/runner-errors";
import { Constructor, RunnerConstructor } from "../../types/constructor";
import { JsonObject } from "../../types/json-object";
import { AvailableRunnersFromList, RunnerToken, RunnerByIdentifier, IStrictRunnerTokenConfig, SoftRunnersList, RunnerByToken } from "../../types/runner-token";
import { EXECUTE_RUNNER_CONTROLLER_METHOD, IRunnerBridgeConstructor, RunnerBridge } from "./runner.bridge";

interface IRunnerBridgeCollectionConfig<M extends SoftRunnersList> {
    runners: M;
}

interface IRunnerByTokenData {
    runnerConstructor?: RunnerConstructor;
    bridgeConstructor: IRunnerBridgeConstructor;
}

interface IRunnerByTokenDataRecord {
    [token: string]: undefined | IRunnerByTokenData;
}

export class RunnersListController<L extends SoftRunnersList> {
    public readonly runnerByTokenDataRecord: IRunnerByTokenDataRecord = {};
    public readonly runnerTokenMap = new Map<AvailableRunnersFromList<L>, RunnerToken>();

    constructor(config: IRunnerBridgeCollectionConfig<L>) {
        this.applyRunnerMap(config.runners);
    }

    public getRunnerToken<R extends AvailableRunnersFromList<L>>(runner: R): RunnerToken {
        const runnerToken = this.runnerTokenMap.get(runner);
        if (!runnerToken) {
            throw new RunnerNotFound({
                message: WORKER_RUNNER_ERROR_MESSAGES.CONSTRUCTOR_NOT_FOUND({
                    runnerName: runner.name,
                })
            });
        }
        return runnerToken;
    }

    public getRunnerTokenByInstance<R extends AvailableRunnersFromList<L>>(runnerInstance: InstanceType<R>): RunnerToken {
        return this.getRunnerToken(Object.getPrototypeOf(runnerInstance).constructor);
    }

    public getRunnerSoft<T extends RunnerToken = RunnerToken>(token: T): RunnerByIdentifier<L, T> | undefined {
        return this.runnerByTokenDataRecord[token]?.runnerConstructor as RunnerByIdentifier<L, T> | undefined;
    }

    public getRunner<T extends RunnerToken = RunnerToken>(token: T): RunnerByIdentifier<L, T> {
        const runnerConstructor = this.getRunnerSoft(token);
        if (!runnerConstructor) {
            throw new RunnerNotFound({
                message: WORKER_RUNNER_ERROR_MESSAGES.CONSTRUCTOR_NOT_FOUND({ token: token })
            });
        }
        return runnerConstructor;
    }

    public hasToken<T extends RunnerToken = RunnerToken>(token: T): boolean {
        return token in this.runnerByTokenDataRecord;
    }

    public hasBridgeConstructor<T extends RunnerToken = RunnerToken>(token: T): boolean {
        const runnerByTokenData = this.runnerByTokenDataRecord[token];
        if (!runnerByTokenData) {
            return false;
        }
        return 'bridgeConstructor' in runnerByTokenData;
    }

    public getRunnerBridgeConstructor<T extends RunnerToken = RunnerToken>(
        token: T
    ): IRunnerBridgeConstructor<RunnerByToken<L, T>> {
        const runnerData = this.runnerByTokenDataRecord[token];
        if (!runnerData) {
            throw new RunnerNotFound({
                message: WORKER_RUNNER_ERROR_MESSAGES.CONSTRUCTOR_NOT_FOUND({ token: token })
            });
        }
        return runnerData.bridgeConstructor;
    }

    public defineRunnerBridge(token: RunnerToken, methodsNames: string[]): void {
        const ResolvedRunner = this.buildBaseBridgeConstructor('ByToken' + token);
        for (const methodsName of methodsNames) {
            this.attachUndeclaredMethod(ResolvedRunner, methodsName)
        }
        this.runnerByTokenDataRecord[token] = {
            bridgeConstructor: ResolvedRunner,
        };
    }

    public getRunnerList(): IStrictRunnerTokenConfig<AvailableRunnersFromList<L>>[] {
        const runnersList = new Array<IStrictRunnerTokenConfig<AvailableRunnersFromList<L>>>();
        for (const [runner, token] of this.runnerTokenMap) {
            runnersList.push({ runner, token });
        }
        return runnersList;
    }

    public getRunnerMethodsNames(token: RunnerToken): string[] {
        const runnerBridgeConstructor = this.getRunnerBridgeConstructor(token);
        const allMethodsNames = Object.keys(runnerBridgeConstructor.prototype);
        const methodsNames = allMethodsNames.filter(methodName => !(methodName in RunnerBridge.prototype));
        return methodsNames;
    }

    private applyRunnerMap(runnersMap: L): void {
        for (const runner of runnersMap) {
            let token: RunnerToken;
            let runnerConstructor: AvailableRunnersFromList<L>;
            if ('token' in runner) {
                token = runner.token;
                runnerConstructor = runner.runner as AvailableRunnersFromList<L>;
            } else {
                token = runner.name;
                runnerConstructor = runner as AvailableRunnersFromList<L>;
            }
            if (runnerConstructor) {
                this.runnerByTokenDataRecord[token] = {
                    bridgeConstructor: this.resolveRunnerBridgeConstructor(runnerConstructor),
                    runnerConstructor: runnerConstructor,
                };
                this.runnerTokenMap.set(runnerConstructor, token);
             } else {
                this.runnerByTokenDataRecord[token] = undefined;
             }
        }
    }

    private recursiveAttachUndeclaredMethods(construct: Constructor, proto: Constructor): void {
        for (const key of Object.getOwnPropertyNames(proto.prototype)) {
            this.attachUndeclaredMethod(construct, key)
            const parent = Object.getPrototypeOf(proto);
            if (parent.prototype) {
                this.recursiveAttachUndeclaredMethods(construct, parent);
            }
        }
    }

    private attachUndeclaredMethod(bridgeConstructor: Constructor, methodName: string): void {
        if (!(methodName in bridgeConstructor.prototype)) {
            bridgeConstructor.prototype[methodName] = function(this: RunnerBridge, ...args: JsonObject[]) {
                return this[EXECUTE_RUNNER_CONTROLLER_METHOD](methodName, args);
            };
        }
    }

    private resolveRunnerBridgeConstructor(runner: RunnerConstructor): IRunnerBridgeConstructor<RunnerConstructor> {
        const ResolvedRunner = this.buildBaseBridgeConstructor(runner.name);
        this.recursiveAttachUndeclaredMethods(ResolvedRunner, runner);
        return ResolvedRunner;
    }

    private buildBaseBridgeConstructor(name: string): IRunnerBridgeConstructor {
        const className = 'Resolved' + name;
        const ResolvedRunner = {[className]: class extends RunnerBridge {}}[className];
        return ResolvedRunner as unknown as IRunnerBridgeConstructor;
    }
} 
