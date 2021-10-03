import { WORKER_RUNNER_ERROR_MESSAGES } from "../errors/error-message";
import { RunnerNotFound } from "../errors/runner-errors";
import { Constructor, RunnerConstructor } from "../types/constructor";
import { JsonObject } from "../types/json-object";
import { AvailableRunnersFromList, RunnerToken, RunnerByIdentifier, RunnerIdentifierConfigList, RunnerByToken } from "../types/runner-identifier";
import { IRunnerBridgeConstructor, RunnerBridge, RUNNER_ENVIRONMENT_CLIENT } from "./runner.bridge";

interface IRunnerIdentifierConfigCollectionOptoins<M extends RunnerIdentifierConfigList> {
    runners: M;
}

interface IRunnerCollectionData {
    runnerConstructor?: RunnerConstructor;
    bridgeConstructor: IRunnerBridgeConstructor;
}

interface IRunnerCollectionDataByTokenRecord {
    [token: string]: undefined | IRunnerCollectionData;
}

export class RunnerIdentifierConfigCollection<L extends RunnerIdentifierConfigList> {
    public readonly runnerByTokenDataRecord: IRunnerCollectionDataByTokenRecord = {};
    public readonly runnerTokenMap = new Map<RunnerConstructor, RunnerToken>();

    constructor(config: IRunnerIdentifierConfigCollectionOptoins<L>) {
        this.applyRunnerIdentifierConfigList(config.runners);
    }

    public getRunnerTokenSoft<R extends RunnerConstructor>(runner: R): RunnerToken | undefined {
        return this.runnerTokenMap.get(runner);
    }

    public getRunnerToken<R extends AvailableRunnersFromList<L>>(runner: R): RunnerToken {
        const runnerToken = this.getRunnerTokenSoft(runner);
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

    public getRunnerConstructorSoft<T extends RunnerToken = RunnerToken>(token: T): RunnerByIdentifier<L, T> | undefined {
        return this.runnerByTokenDataRecord[token]?.runnerConstructor as RunnerByIdentifier<L, T> | undefined;
    }

    public getRunnerConstructor<T extends RunnerToken = RunnerToken>(token: T): RunnerByIdentifier<L, T> {
        const runnerConstructor = this.getRunnerConstructorSoft(token);
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
                message: WORKER_RUNNER_ERROR_MESSAGES.CONSTRUCTOR_NOT_FOUND({
                    token: token,
                    runnerName: this.getRunnerConstructorSoft(token)?.name,
                }),
            });
        }
        return runnerData.bridgeConstructor;
    }

    public defineRunnerConstructor(token: RunnerToken, runnerConstructor: RunnerConstructor): void {
        this.runnerByTokenDataRecord[token] = {
            bridgeConstructor: this.resolveRunnerBridgeConstructor(runnerConstructor),
            runnerConstructor,
        };
        this.runnerTokenMap.set(runnerConstructor as AvailableRunnersFromList<L>, token);
    }

    public defineRunnerBridge<T extends RunnerToken = RunnerToken>(
        token: T, methodsNames: string[]
    ): IRunnerBridgeConstructor<RunnerByToken<L, T>> {
        const ResolvedRunner = this.buildBaseBridgeConstructor('ByToken' + token);
        for (const methodsName of methodsNames) {
            this.attachUndeclaredMethod(ResolvedRunner, methodsName)
        }
        this.runnerByTokenDataRecord[token] = {
            bridgeConstructor: ResolvedRunner,
        };
        return ResolvedRunner;
    }

    public getRunnerMethodsNames(token: RunnerToken): string[] {
        const runnerBridgeConstructor = this.getRunnerBridgeConstructor(token);
        const allMethodsNames = Object.keys(runnerBridgeConstructor.prototype);
        const methodsNames = allMethodsNames.filter(methodName => !(methodName in RunnerBridge.prototype));
        return methodsNames;
    }

    /** WARNING: generates different tokens for different areas during minified build */
    public generateTokenNameByRunnerConstructor(runnerConstructor: RunnerConstructor): string {
        return runnerConstructor.name;
    }

    private applyRunnerIdentifierConfigList(runnerIdentifierConfigList: L): void {
        for (const identifierConfig of runnerIdentifierConfigList) {
            let token: RunnerToken;
            let runnerConstructor: AvailableRunnersFromList<L> | undefined;
            if ('token' in identifierConfig) {
                token = identifierConfig.token;
                runnerConstructor = identifierConfig.runner as AvailableRunnersFromList<L> | undefined;
            } else {
                token = this.generateTokenNameByRunnerConstructor(identifierConfig);
                runnerConstructor = identifierConfig as AvailableRunnersFromList<L>;
            }
            if (runnerConstructor) {
                this.defineRunnerConstructor(token, runnerConstructor);
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
                return this[RUNNER_ENVIRONMENT_CLIENT].execute(methodName, args);
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
