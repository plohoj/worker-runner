import { WORKER_RUNNER_ERROR_MESSAGES } from "../errors/error-message";
import { RunnerNotFound } from "../errors/runner-errors";
import { Constructor, RunnerConstructor } from "../types/constructor";
import { JsonLike } from "../types/json-like";
import { AvailableRunnersFromList, RunnerToken, RunnerIdentifierConfigList, RunnerByToken } from "../types/runner-identifier";
import { IRunnerControllerConstructor, RunnerController, RUNNER_ENVIRONMENT_CLIENT } from "./runner.controller";

interface IRunnerIdentifierConfigCollectionOptions<M extends RunnerIdentifierConfigList> {
    runners: M;
}

interface IRunnerCollectionData {
    runnerConstructor?: RunnerConstructor;
    controllerConstructor: IRunnerControllerConstructor;
}

interface IRunnerCollectionDataByTokenRecord {
    [token: string]: undefined | IRunnerCollectionData;
}

export class RunnerIdentifierConfigCollection<L extends RunnerIdentifierConfigList = RunnerIdentifierConfigList> {
    public readonly runnerByTokenDataRecord: IRunnerCollectionDataByTokenRecord = {};
    public readonly runnerTokenMap = new Map<RunnerConstructor, RunnerToken>();

    constructor(config: IRunnerIdentifierConfigCollectionOptions<L>) {
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
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        return this.getRunnerToken(Object.getPrototypeOf(runnerInstance).constructor);
    }

    public getRunnerConstructorSoft(token: RunnerToken): RunnerConstructor | undefined {
        return this.runnerByTokenDataRecord[token]?.runnerConstructor;
    }

    public getRunnerConstructor(token: RunnerToken): RunnerConstructor {
        const runnerConstructor = this.getRunnerConstructorSoft(token);
        if (!runnerConstructor) {
            throw new RunnerNotFound({
                message: WORKER_RUNNER_ERROR_MESSAGES.CONSTRUCTOR_NOT_FOUND({ token: token })
            });
        }
        return runnerConstructor;
    }

    public hasToken(token: RunnerToken): boolean {
        return token in this.runnerByTokenDataRecord;
    }

    public hasControllerConstructor(token: RunnerToken): boolean {
        const runnerByTokenData = this.runnerByTokenDataRecord[token];
        if (!runnerByTokenData) {
            return false;
        }
        return 'controllerConstructor' in runnerByTokenData;
    }

    public getRunnerControllerConstructor<T extends RunnerToken = RunnerToken>(
        token: T
    ): IRunnerControllerConstructor<RunnerByToken<L, T>> {
        const runnerData = this.runnerByTokenDataRecord[token];
        if (!runnerData) {
            throw new RunnerNotFound({
                message: WORKER_RUNNER_ERROR_MESSAGES.CONSTRUCTOR_NOT_FOUND({
                    token: token,
                    runnerName: this.getRunnerConstructorSoft(token)?.name,
                }),
            });
        }
        return runnerData.controllerConstructor;
    }

    public defineRunnerConstructor(token: RunnerToken, runnerConstructor: RunnerConstructor): void {
        this.runnerByTokenDataRecord[token] = {
            controllerConstructor: this.resolveRunnerControllerConstructor(runnerConstructor),
            runnerConstructor,
        };
        this.runnerTokenMap.set(runnerConstructor as AvailableRunnersFromList<L>, token);
    }

    public defineRunnerController<T extends RunnerToken = RunnerToken>(
        token: T, methodsNames: string[]
    ): IRunnerControllerConstructor<RunnerByToken<L, T>> {
        const ResolvedRunner = this.buildBaseControllerConstructor('ByToken' + token);
        for (const methodsName of methodsNames) {
            this.attachUndeclaredMethod(ResolvedRunner, methodsName)
        }
        this.runnerByTokenDataRecord[token] = {
            controllerConstructor: ResolvedRunner,
        };
        return ResolvedRunner;
    }

    public getRunnerMethodsNames(token: RunnerToken): string[] {
        const runnerControllerConstructor = this.getRunnerControllerConstructor(token);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const allMethodsNames = Object.keys(runnerControllerConstructor.prototype);
        const methodsNames = allMethodsNames.filter(methodName => !(methodName in RunnerController.prototype));
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
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const parent = Object.getPrototypeOf(proto);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            if (parent.prototype) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                this.recursiveAttachUndeclaredMethods(construct, parent);
            }
        }
    }

    private attachUndeclaredMethod(controllerConstructor: Constructor, methodName: string): void {
        if (!(methodName in controllerConstructor.prototype)) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            controllerConstructor.prototype[methodName] = function(this: RunnerController, ...args: JsonLike[]) {
                return this[RUNNER_ENVIRONMENT_CLIENT].execute(methodName, args);
            };
        }
    }

    private resolveRunnerControllerConstructor(runner: RunnerConstructor): IRunnerControllerConstructor<RunnerConstructor> {
        const ResolvedRunner = this.buildBaseControllerConstructor(runner.name);
        this.recursiveAttachUndeclaredMethods(ResolvedRunner, runner);
        return ResolvedRunner;
    }

    private buildBaseControllerConstructor(name: string): IRunnerControllerConstructor {
        const className = 'Resolved' + name;
        const ResolvedRunner = {[className]: class extends RunnerController {}}[className];
        return ResolvedRunner as unknown as IRunnerControllerConstructor;
    }
} 
