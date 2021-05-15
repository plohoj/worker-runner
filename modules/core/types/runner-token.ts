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

export type AnyRunnerFromList<L extends SoftRunnersList>
    = L extends ArrayLike<infer TOR>
        ? TOR extends ISoftRunnerTokenConfig
            ? Exclude<TOR['runner'], undefined>
            : TOR
        : never;

export type RunnerIdentifier<M extends SoftRunnersList = SoftRunnersList> = RunnerToken | AnyRunnerFromList<M>;

type RunnerByToken<M extends SoftRunnersList, T extends RunnerToken>
    = isLiteralString<T> extends true
        ? M extends ArrayLike<infer TOR>
            ? TOR extends ISoftRunnerTokenConfig
                ? T extends TOR['token']
                    ? isLiteralString<TOR['token']> extends true
                        ? Exclude<TOR['runner'], undefined>
                        : never
                    : never
                : never
            : never
        :never;

type NotTargetRunners<M extends SoftRunnersList, T extends RunnerToken>
    = isLiteralString<T> extends true
        ? M extends ArrayLike<infer TOR>
            ? TOR extends ISoftRunnerTokenConfig
                ? T extends TOR['token']
                    ? never
                    : isLiteralString<TOR['token']> extends true
                        ? Exclude<TOR['runner'], undefined>
                        : never
                : never
            : never
        : never;

type RunnerInIdentifierMap<M extends SoftRunnersList, R extends RunnerConstructor>
    = M extends ArrayLike<infer TOR>
        ? TOR extends R 
            ? R
            : TOR extends ISoftRunnerTokenConfig
                ? TOR['runner'] extends R
                    ? Exclude<TOR['runner'], undefined>
                    : never
                : never
        : never;

export type RunnerByIdentifier<L extends SoftRunnersList, T extends RunnerIdentifier>
    = T extends RunnerConstructor
        ? RunnerInIdentifierMap<L, T>
        : T extends RunnerToken
            ? RunnerByToken<L, T> extends never
                ? Exclude<AnyRunnerFromList<L>, NotTargetRunners<L, T>>
                : RunnerByToken<L, T>
            : never;
