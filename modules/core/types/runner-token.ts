import { RunnerConstructor } from "./constructor";

/**
 * Runner identification token.
 * By default equal to the Runner class name
 */
export type RunnerToken = string;

export type IStrictRunnerTokenConfig<R extends RunnerConstructor = RunnerConstructor, T extends RunnerToken = RunnerToken> = {
    token: T;
    runner: R;
}
export type ISoftRunnerTokenConfig<R extends RunnerConstructor = RunnerConstructor, T extends RunnerToken = RunnerToken> = {
    token: T;
    runner?: R;
}

export type StrictRunnersList = ReadonlyArray<IStrictRunnerTokenConfig | RunnerConstructor>;
export type SoftRunnersList = ReadonlyArray<ISoftRunnerTokenConfig | RunnerConstructor>;

type isLiteralString<T extends string> = string extends T ? false : true;

export type AvailableRunnersFromList<L extends SoftRunnersList>
    = L extends ArrayLike<infer TOR>
        ? TOR extends ISoftRunnerTokenConfig
            ? undefined extends TOR['runner'] 
                ? never
                : TOR['runner']
            : TOR
        : never;

export type AnyRunnerFromList<L extends SoftRunnersList>
    = L extends ArrayLike<infer TOR>
        ? TOR extends ISoftRunnerTokenConfig
            ? Exclude<TOR['runner'], undefined>
            : TOR
        : never;

export type RunnerIdentifier<L extends SoftRunnersList = SoftRunnersList> = RunnerToken | AvailableRunnersFromList<L>;

export type RunnerByToken<L extends SoftRunnersList, T extends RunnerToken>
    = isLiteralString<T> extends true
        ? L extends ArrayLike<infer TOR>
            ? TOR extends ISoftRunnerTokenConfig
                ? T extends TOR['token']
                    ? isLiteralString<TOR['token']> extends true
                        ? Exclude<TOR['runner'], undefined>
                        : never
                    : never
                : never
            : never
        :never;

type NotTargetRunners<L extends SoftRunnersList, T extends RunnerToken>
    = isLiteralString<T> extends true
        ? L extends ArrayLike<infer TOR>
            ? TOR extends ISoftRunnerTokenConfig
                ? T extends TOR['token']
                    ? never
                    : isLiteralString<TOR['token']> extends true
                        ? Exclude<TOR['runner'], undefined>
                        : never
                : never
            : never
        : never;

type RunnerConstructorInList<L extends SoftRunnersList, R extends RunnerConstructor>
    = L extends ArrayLike<infer TOR>
        ? TOR extends R 
            ? R
            : TOR extends ISoftRunnerTokenConfig
                ? TOR['runner'] extends R
                    ? undefined extends TOR['runner']
                        ? never
                        : TOR['runner']
                    : never
                : never
        : never;

export type RunnerByIdentifier<L extends SoftRunnersList, T extends RunnerIdentifier>
    = T extends RunnerConstructor
        ? RunnerConstructorInList<L, T>
        : T extends RunnerToken
            ? RunnerByToken<L, T> extends never
                ? Exclude<AnyRunnerFromList<L>, NotTargetRunners<L, T>>
                : RunnerByToken<L, T>
            : never;
