import { WORKER_RUNNER_ERROR_MESSAGES } from "../../errors/error-message";
import { RunnerNotFound } from "../../errors/runner-errors";
import { Constructor, RunnerConstructor } from "../../types/constructor";
import { JsonObject } from "../../types/json-object";
import { EXECUTE_RUNNER_CONTROLLER_METHOD, IRunnerBridgeConstructor, RunnerBridge } from "./runner.bridge";

/**
 * Runner identification token.
 * By default equal to the Runner class name
 */
export type RunnerToken = string;

interface IRunnerWidthToken<R extends RunnerConstructor = RunnerConstructor> {
    token: RunnerToken,
    runner: R,
}

export type RunnersList = ReadonlyArray<IRunnerWidthToken | RunnerConstructor>

type isLiteralString<T extends string> = string extends T ? false : true;

export type AnyRunnerFromList<T extends RunnersList>
    = T extends ArrayLike<infer TOR>
        ? TOR extends IRunnerWidthToken
            ? TOR['runner']
            : TOR
        : never;

export type RunnerIdentifier<M extends RunnersList = RunnersList> = RunnerToken | AnyRunnerFromList<M>;

type RunnerByToken<M extends RunnersList, T extends RunnerToken>
    = isLiteralString<T> extends true
        ? M extends ArrayLike<infer TOR>
            ? TOR extends IRunnerWidthToken
                ? T extends TOR['token']
                    ? isLiteralString<TOR['token']> extends true
                        ? TOR['runner']
                        : never
                    : never
                : never
            : never
        :never;

type NotTargetRunners<M extends RunnersList, T extends RunnerToken>
    = isLiteralString<T> extends true
        ? M extends ArrayLike<infer TOR>
            ? TOR extends IRunnerWidthToken
                ? T extends TOR['token']
                    ? never
                    : isLiteralString<TOR['token']> extends true
                        ? TOR['runner']
                        : never
                : never
            : never
        : never;

type RunnerInIdentifierMap<M extends RunnersList, R extends RunnerConstructor>
    = M extends ArrayLike<infer TOR>
        ? TOR extends R 
            ? R
            : TOR extends IRunnerWidthToken
                ? TOR['runner'] extends R
                    ? TOR['runner']
                    : never
                : never
        : never;

// TODO Just transfer RunnerIdentifierMap to IRunnerWidthToken
export type RunnerByIdentifier<M extends RunnersList, T extends RunnerIdentifier>
    = T extends RunnerConstructor
        ? RunnerInIdentifierMap<M, T>
        : T extends RunnerToken
            ? RunnerByToken<M, T> extends never
                ? Exclude<AnyRunnerFromList<M>, NotTargetRunners<M, T>>
                : RunnerByToken<M, T>
            : never

interface IRunnerBridgeCollectionConfig<M extends RunnersList> {
    runners: M;
}

interface IRunnerByTokenDataRecord {
    [token: string]: {
        runnerConstructor: RunnerConstructor;
        bridgeConstructor: IRunnerBridgeConstructor;
    }
}

export class RunnersListController<L extends RunnersList> {
    public readonly runnerByTokenDataRecord: IRunnerByTokenDataRecord = {};
    public readonly runnerTokenMap = new Map<AnyRunnerFromList<L>, RunnerToken>();

    constructor(config: IRunnerBridgeCollectionConfig<L>) {
        this.applyRunnerMap(config.runners);
    }

    public getRunnerToken<R extends AnyRunnerFromList<L>>(runner: R): RunnerToken {
        const runnerToken = this.runnerTokenMap.get(runner);
        if (!runnerToken) {
            throw new RunnerNotFound({
                message: WORKER_RUNNER_ERROR_MESSAGES.CONSTRUCTOR_NOT_FOUND({runnerName: runner.name})
            });
        }
        return runnerToken;
    }

    public getRunnerTokenByInstance<R extends AnyRunnerFromList<L>>(runnerInstance: InstanceType<R>): RunnerToken {
        return this.getRunnerToken(Object.getPrototypeOf(runnerInstance).constructor);
    }

    public getRunner<T extends RunnerToken = RunnerToken>(token: T): RunnerByIdentifier<L, T> {
        const runnerData = this.runnerByTokenDataRecord[token];
        if (!runnerData) {
            throw new RunnerNotFound();
        }
        return runnerData.runnerConstructor as RunnerByIdentifier<L, T>;
    }

    public getRunnerBridgeConstructor<T extends RunnerToken = RunnerToken>(
        token: T
    ): IRunnerBridgeConstructor<RunnerByIdentifier<L, T>> {
        const runnerData = this.runnerByTokenDataRecord[token];
        if (!runnerData) {
            throw new RunnerNotFound();
        }
        return runnerData.bridgeConstructor as IRunnerBridgeConstructor<RunnerByIdentifier<L, T>>;
    }

    public getRunnerList(): IRunnerWidthToken<AnyRunnerFromList<L>>[] {
        const runnersList = new Array<IRunnerWidthToken<AnyRunnerFromList<L>>>();
        for (const [runner, token] of this.runnerTokenMap) {
            runnersList.push({ runner, token });
        }
        return runnersList;
    }

    private applyRunnerMap(runnersMap: L): void {
        for (const runner of runnersMap) {
            let token: RunnerToken;
            let runnerConstructor: AnyRunnerFromList<L>;
            if ('token' in runner) {
                token = runner.token;
                runnerConstructor = runner.runner as AnyRunnerFromList<L>;
            } else {
                token = runner.name;
                runnerConstructor = runner as AnyRunnerFromList<L>;
            }
            this.runnerByTokenDataRecord[token] = {
                bridgeConstructor: this.resolveRunnerBridgeConstructor(runnerConstructor),
                runnerConstructor: runnerConstructor,
            };
            this.runnerTokenMap.set(runnerConstructor, token);
        }
    }

    private recursiveOverrideProperty(construct: Constructor, proto: Constructor) {
        for (const key of Object.getOwnPropertyNames(proto.prototype)) {
            if (!(key in RunnerBridge.prototype)) {
                construct.prototype[key] = function(this: RunnerBridge, ...args: JsonObject[]) {
                    return this[EXECUTE_RUNNER_CONTROLLER_METHOD](key, args);
                };
            }
            const parent = Object.getPrototypeOf(proto);
            if (parent.prototype) {
                this.recursiveOverrideProperty(construct, parent);
            }
        }
    }

    private resolveRunnerBridgeConstructor(runner: RunnerConstructor): IRunnerBridgeConstructor<RunnerConstructor> {
        const className = 'Resolved' + runner.name;
        const ResolvedRunner = {[className]: class extends RunnerBridge {}}[className];
        this.recursiveOverrideProperty(ResolvedRunner, runner);
        return ResolvedRunner as unknown as IRunnerBridgeConstructor<RunnerConstructor>;
    }
} 
