// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/no-unused-vars */
import { RunnerConstructor } from "./constructor";

/**
 * Runner identification token.
 * By default equal to the Runner class name
 */
export type RunnerToken = string;

export type IRunnerTokenIdentifier<
    R extends RunnerConstructor | undefined = RunnerConstructor,
    T extends RunnerToken = RunnerToken
> = {
    token: T;
    runner?: R;
}

export class RunnerTokenIdentifier<
    R extends RunnerConstructor | undefined = undefined,
    T extends RunnerToken = RunnerToken
> {
    token: T;
    runner?: R;

    constructor(config: IRunnerTokenIdentifier<R, T> | {token: T}) {
        this.token = config.token;
        if ((config as IRunnerTokenIdentifier).runner) {
            this.runner = (config as IRunnerTokenIdentifier).runner as R;
        }
    }
}

export type AnyRunnerIdentifier<R extends RunnerConstructor = RunnerConstructor, T extends RunnerToken = RunnerToken>
    = T | R | IRunnerTokenIdentifier<R, T> | IRunnerTokenIdentifier<undefined, T>;

export type RunnerIdentifierConfigList = (
    | IRunnerTokenIdentifier<RunnerConstructor>
    | IRunnerTokenIdentifier<undefined>
    | RunnerConstructor
)[];

type isLiteralString<T extends string> = string extends T ? false : true;

export type RunnerByToken<L extends RunnerIdentifierConfigList, T extends RunnerToken>
    = isLiteralString<T> extends true
        ? L extends ArrayLike<infer IOR>
            ? IOR extends IRunnerTokenIdentifier<infer IR, infer IT>
                ? T extends IT
                    ? isLiteralString<IT> extends true
                        ? 'runner' extends keyof IOR
                            ? Exclude<IOR['runner'], undefined>
                            // If the configuration specifies a token but does not specify a Runner type,
                            // then the Runner type is unknown
                            : unknown
                        : never
                    : never
                : never
            : never
        : never;

export type RunnerByTokenIdentifier<L extends RunnerIdentifierConfigList, I extends IRunnerTokenIdentifier>
    = Exclude<I['runner'], undefined> extends never
        ? RunnerByLiteralOrNonLiteralToken<L, I['token']>
        : Exclude<I['runner'], undefined>;

type RunnersWithoutLiteralToken<L extends RunnerIdentifierConfigList>
    = L extends ArrayLike<infer IOR>
        ? IOR extends IRunnerTokenIdentifier<infer _IR extends RunnerConstructor, infer IT>
            ? isLiteralString<IT> extends true
                ? never
                : 'runner' extends keyof IOR
                    ? Exclude<IOR['runner'], undefined>
                    : never
            : IOR extends RunnerConstructor
                ? IOR
                : never
        : never;

export type AllRunnersFromList<L extends RunnerIdentifierConfigList>
    = L extends ArrayLike<infer IOR>
        ? IOR extends IRunnerTokenIdentifier<infer IR extends RunnerConstructor>
            ? IR
            : IOR extends RunnerConstructor
                ? IOR
                : never
        : never;

export type AvailableRunnerIdentifier<L extends RunnerIdentifierConfigList = RunnerIdentifierConfigList>
     = AllRunnersFromList<L> | AnyRunnerIdentifier;

type RunnerByLiteralOrNonLiteralToken<L extends RunnerIdentifierConfigList, T extends RunnerToken>
    = RunnerByToken<L, T> extends never
        ? isLiteralString<T> extends true
            ? RunnersWithoutLiteralToken<L> extends never
                // If there are no suitable Runners in the list, return unknown
                ? unknown
                : RunnersWithoutLiteralToken<L>
            : AllRunnersFromList<L>
        : RunnerByToken<L, T>

export type RunnerByAnyIdentifier<L extends RunnerIdentifierConfigList, I extends AnyRunnerIdentifier>
    = I extends RunnerConstructor
        ? I
        : I extends RunnerToken
            ? RunnerByLiteralOrNonLiteralToken<L, I>
            : I extends IRunnerTokenIdentifier
                ? RunnerByTokenIdentifier<L, I>
                : never;
