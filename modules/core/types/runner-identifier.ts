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

export type AvailableRunnerIdentifier<L extends SoftRunnersList = SoftRunnersList> = RunnerToken | AvailableRunnersFromList<L>;
export type RunnerIdentifier<R extends RunnerConstructor = RunnerConstructor> = RunnerToken | R;

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

type RunnersWithoutLiteralToken<L extends SoftRunnersList>
    = L extends ArrayLike<infer TOR>
        ? TOR extends ISoftRunnerTokenConfig
            ? isLiteralString<TOR['token']> extends true
                ? never
                : 'runner' extends keyof TOR 
                    ? Exclude<TOR['runner'], undefined>
                    : never
            : TOR
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

export type StrictRunnerByIdentifier<L extends SoftRunnersList, I extends AvailableRunnerIdentifier<L>>
    = I extends RunnerConstructor
        ? RunnerConstructorInList<L, I>
        : I extends RunnerToken
            ? RunnerByToken<L, I> extends never
                ? isLiteralString<I> extends true
                    ? RunnersWithoutLiteralToken<L>
                    : AnyRunnerFromList<L>
                : RunnerByToken<L, I>
            : never;

export type SoftRunnerByIdentifier<L extends SoftRunnersList, I extends RunnerIdentifier>
    = I extends RunnerConstructor
        ? I
        : I extends RunnerToken
            ? RunnerByToken<L, I> extends never
                ? isLiteralString<I> extends true
                    ? RunnersWithoutLiteralToken<L>
                    : AnyRunnerFromList<L>
                : RunnerByToken<L, I>
            : unknown;
